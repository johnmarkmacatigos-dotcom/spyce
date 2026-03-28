import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as stream from 'stream';
import { promisify } from 'util';

const pipeline = promisify(stream.pipeline);

// ⚠️  UPDATE: Set these in .env
// AWS_REGION=ap-southeast-1
// AWS_ACCESS_KEY_ID=...
// AWS_SECRET_ACCESS_KEY=...
// S3_BUCKET_NAME=spyce-media-prod

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);

  private readonly client = new S3Client({
    region: process.env.AWS_REGION || 'ap-southeast-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  private readonly bucket = process.env.S3_BUCKET_NAME || 'spyce-media-prod';

  // ⚠️  UPDATE: Replace with your CloudFront distribution domain
  private readonly cdnBase = process.env.CLOUDFRONT_DOMAIN
    ? `https://${process.env.CLOUDFRONT_DOMAIN}`
    : `https://${this.bucket}.s3.amazonaws.com`;

  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 1800,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async uploadFile(
    localPath: string,
    s3Key: string,
    contentType: string,
  ): Promise<void> {
    const fileContent = fs.readFileSync(localPath);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType,
        CacheControl: contentType.includes('m3u8')
          ? 'no-cache'
          : 'max-age=31536000',
      }),
    );
  }

  async downloadFile(s3Key: string, localPath: string): Promise<void> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: s3Key });
    const response = await this.client.send(command);
    const writeStream = fs.createWriteStream(localPath);
    await pipeline(response.Body as any, writeStream);
  }

  async deleteFile(s3Key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: s3Key }),
    );
  }

  getCdnUrl(key: string): string {
    return `${this.cdnBase}/${key}`;
  }
}
