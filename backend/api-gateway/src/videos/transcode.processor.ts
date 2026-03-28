import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../storage/s3.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

// ⚠️  UPDATE: Ensure ffmpeg is installed on your server/container
// For AWS: use AWS MediaConvert instead (see comments below)

@Processor('video-transcode')
export class VideoTranscodeProcessor {
  private readonly logger = new Logger(VideoTranscodeProcessor.name);

  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
  ) {}

  @Process('transcode')
  async handleTranscode(job: Job) {
    const { videoId, userId, rawKey } = job.data;
    const tmpDir = path.join(os.tmpdir(), `spyce_${videoId}`);

    try {
      this.logger.log(`Starting transcode for video ${videoId}`);
      fs.mkdirSync(tmpDir, { recursive: true });

      // 1. Download raw video from S3
      const inputPath = path.join(tmpDir, 'input.mp4');
      await this.s3.downloadFile(rawKey, inputPath);

      // 2. AI content moderation pre-screen
      // ⚠️  UPDATE: Integrate with your AI service endpoint
      // const moderationResult = await this.moderateContent(inputPath);
      // if (moderationResult.blocked) { await this.markFailed(videoId, 'content_violation'); return; }

      // 3. Generate thumbnail
      const thumbnailPath = path.join(tmpDir, 'thumbnail.jpg');
      await execAsync(
        `ffmpeg -i "${inputPath}" -ss 00:00:01 -vframes 1 -q:v 2 "${thumbnailPath}"`,
      );

      // 4. Get video metadata (dimensions, duration)
      const { stdout: probeOutput } = await execAsync(
        `ffprobe -v quiet -print_format json -show_streams "${inputPath}"`,
      );
      const probe = JSON.parse(probeOutput);
      const videoStream = probe.streams.find((s: any) => s.codec_type === 'video');
      const duration = Math.round(parseFloat(videoStream?.duration || '0'));
      const width = videoStream?.width || 1080;
      const height = videoStream?.height || 1920;

      // 5. FFmpeg HLS multi-quality transcode
      const hlsDir = path.join(tmpDir, 'hls');
      fs.mkdirSync(hlsDir, { recursive: true });

      /*
       * HLS transcode command — produces 360p, 720p, 1080p streams + master playlist
       * Adjust bitrates based on your bandwidth budget
       */
      const ffmpegCmd = [
        `ffmpeg -i "${inputPath}"`,
        `-filter_complex "[0:v]split=3[v1][v2][v3]"`,
        `-map "[v1]" -vf "scale=640:360" -c:v libx264 -crf 23 -b:v 800k -preset fast`,
        `-hls_time 4 -hls_playlist_type vod`,
        `-hls_segment_filename "${hlsDir}/360p_%04d.ts" "${hlsDir}/360p.m3u8"`,
        `-map "[v2]" -vf "scale=1280:720" -c:v libx264 -crf 21 -b:v 2500k -preset fast`,
        `-hls_time 4 -hls_playlist_type vod`,
        `-hls_segment_filename "${hlsDir}/720p_%04d.ts" "${hlsDir}/720p.m3u8"`,
        `-map "[v3]" -vf "scale=1920:1080" -c:v libx264 -crf 20 -b:v 5000k -preset fast`,
        `-hls_time 4 -hls_playlist_type vod`,
        `-hls_segment_filename "${hlsDir}/1080p_%04d.ts" "${hlsDir}/1080p.m3u8"`,
        `-map 0:a -c:a aac -b:a 128k -ac 2`,
      ].join(' \\\n  ');

      await execAsync(ffmpegCmd);

      // 6. Create master HLS playlist
      const masterPlaylist = [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        '#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360',
        '360p.m3u8',
        '#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720',
        '720p.m3u8',
        '#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080',
        '1080p.m3u8',
      ].join('\n');
      fs.writeFileSync(path.join(hlsDir, 'master.m3u8'), masterPlaylist);

      // 7. Upload all HLS files to S3
      const hlsBase = `hls/${userId}/${videoId}`;
      const thumbnailKey = `thumbnails/${userId}/${videoId}.jpg`;

      await this.s3.uploadFile(thumbnailPath, thumbnailKey, 'image/jpeg');

      const hlsFiles = fs.readdirSync(hlsDir);
      for (const file of hlsFiles) {
        const contentType = file.endsWith('.m3u8')
          ? 'application/x-mpegURL'
          : 'video/MP2T';
        await this.s3.uploadFile(
          path.join(hlsDir, file),
          `${hlsBase}/${file}`,
          contentType,
        );
      }

      // 8. Mark video as published
      await this.prisma.video.update({
        where: { id: videoId },
        data: {
          status: 'published',
          hlsKey: `${hlsBase}/master.m3u8`,
          thumbnailKey,
          durationSecs: duration,
          width,
          height,
          publishedAt: new Date(),
          // Initial engagement score from AI (placeholder)
          engagementScore: 1.0,
        },
      });

      this.logger.log(`Video ${videoId} published successfully`);

      // 9. Cleanup temp files
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (error) {
      this.logger.error(`Transcode failed for video ${videoId}`, error);
      await this.prisma.video.update({
        where: { id: videoId },
        data: { status: 'failed' },
      });
      throw error; // Bull will retry
    }
  }
}

/*
 * ⚠️  AWS MediaConvert Alternative (Production Recommended)
 * For high volume, replace FFmpeg with AWS MediaConvert:
 *
 * import { MediaConvertClient, CreateJobCommand } from "@aws-sdk/client-mediaconvert";
 *
 * const client = new MediaConvertClient({
 *   region: process.env.AWS_REGION,
 *   endpoint: process.env.MEDIACONVERT_ENDPOINT, // from AWS console
 * });
 *
 * const job = await client.send(new CreateJobCommand({
 *   Role: process.env.MEDIACONVERT_ROLE_ARN,
 *   Settings: { ... } // HLS output group config
 * }));
 */
