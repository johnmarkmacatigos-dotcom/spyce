// ============================================================
// SPYCE - Client-side Video Trimmer Utility
// Actually cuts the video file in browser before upload
// Uses MediaRecorder to re-encode trimmed segment
// FILE: frontend/src/utils/VideoTrimmer.js
// ============================================================

/**
 * Trims a video file in the browser by actually re-encoding it.
 * Returns a new Blob containing only the trimmed segment.
 *
 * @param {File} file - Original video file
 * @param {number} startTime - Trim start in seconds
 * @param {number} endTime - Trim end in seconds
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<Blob>} - Trimmed video blob
 */
export async function trimVideoFile(file, startTime, endTime, onProgress) {
  return new Promise((resolve, reject) => {
    const duration = endTime - startTime;
    if (duration <= 0) {
      reject(new Error('Invalid trim range'));
      return;
    }

    // Create a video element to play from
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const url = URL.createObjectURL(file);
    video.src = url;

    video.addEventListener('loadedmetadata', () => {
      // Create a canvas to capture frames
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Use video's natural dimensions
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 1280;

      // Set up MediaRecorder to record canvas output
      const stream = canvas.captureStream(30); // 30fps

      // Try different codecs in order of support
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
      ];

      let mimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      if (!mimeType) {
        URL.revokeObjectURL(url);
        reject(new Error('MediaRecorder not supported in this browser'));
        return;
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps — good quality, reasonable size
      });

      const chunks = [];
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        URL.revokeObjectURL(url);
        const blob = new Blob(chunks, { type: mimeType });
        resolve(blob);
      };

      recorder.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error('Recording failed: ' + e.error?.message));
      };

      // Seek to start time then begin recording
      video.currentTime = startTime;

      video.onseeked = () => {
        video.play();
        recorder.start(100); // collect data every 100ms

        let lastProgress = 0;

        const frameLoop = () => {
          if (video.currentTime >= endTime || video.ended) {
            recorder.stop();
            video.pause();
            return;
          }

          // Draw current frame to canvas
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          } catch {}

          // Report progress
          const progress = Math.min(100,
            ((video.currentTime - startTime) / duration) * 100
          );
          if (Math.floor(progress) !== lastProgress) {
            lastProgress = Math.floor(progress);
            onProgress?.(lastProgress);
          }

          requestAnimationFrame(frameLoop);
        };

        requestAnimationFrame(frameLoop);
      };
    });

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load video for trimming'));
    };
  });
}

/**
 * Quick check: does this browser support client-side trimming?
 */
export function canTrimInBrowser() {
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof HTMLVideoElement !== 'undefined'
  );
}

/**
 * Format bytes to human readable
 */
export function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
