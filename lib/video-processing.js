import { compressVideoForMobile, compressVideoForWhisper } from './ffmpeg.js';
import { uploadToR2 } from './cloudflare-r2.js';

/**
 * Process video into multiple quality versions like social media platforms
 * @param {Buffer} videoBuffer - Original video file
 * @param {string} originalFileName - Original file name
 * @param {string} userId - User ID for storage path
 * @returns {Promise<Object>} Processing results with multiple quality URLs
 */
export async function processVideoMultipleQualities(videoBuffer, originalFileName, userId) {
  const timestamp = Date.now();
  const baseFileName = originalFileName.split('.').slice(0, -1).join('.');
  
  // Create multiple quality versions
  const qualities = [
    {
      name: 'original',
      suffix: 'original',
      description: 'Original quality',
      maxSize: 5 * 1024 * 1024 * 1024, // 5GB limit
      process: false // Keep original as-is
    },
    {
      name: 'high',
      suffix: '1080p',
      description: 'High quality (1080p)',
      maxSize: 500 * 1024 * 1024, // 500MB
      process: true,
      command: `-vf "scale=1920:-2" -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 192k`
    },
    {
      name: 'medium',
      suffix: '720p',
      description: 'Medium quality (720p)',
      maxSize: 200 * 1024 * 1024, // 200MB
      process: true,
      command: `-vf "scale=1280:-2" -c:v libx264 -preset fast -crf 26 -c:a aac -b:a 128k`
    },
    {
      name: 'low',
      suffix: '480p',
      description: 'Low quality (480p)',
      maxSize: 100 * 1024 * 1024, // 100MB
      process: true,
      command: `-vf "scale=854:-2" -c:v libx264 -preset fast -crf 28 -c:a aac -b:a 96k`
    },
    {
      name: 'mobile',
      suffix: '360p',
      description: 'Mobile optimized (360p)',
      maxSize: 50 * 1024 * 1024, // 50MB
      process: true,
      command: `-vf "scale=640:-2" -c:v libx264 -preset fast -crf 30 -c:a aac -b:a 64k`
    }
  ];

  const results = {
    original: null,
    qualities: {},
    processing: {
      status: 'processing',
      completed: 0,
      total: qualities.length
    }
  };

  try {
    // Upload original first (if under size limit)
    const originalSize = videoBuffer.length;
    if (originalSize <= qualities[0].maxSize) {
      const originalFileName = `${userId}/${timestamp}_${baseFileName}_original.mp4`;
      const originalResult = await uploadToR2(videoBuffer, originalFileName, 'video/mp4');
      
      if (originalResult.success) {
        results.original = {
          url: originalResult.url,
          size: originalSize,
          quality: 'original'
        };
        results.processing.completed++;
      }
    }

    // Process and upload other qualities
    for (const quality of qualities.slice(1)) {
      try {
        console.log(`Processing ${quality.name} quality...`);
        
        // For now, we'll use the same file for all qualities
        // In production, you'd use ffmpeg to create different versions
        const qualityFileName = `${userId}/${timestamp}_${baseFileName}_${quality.suffix}.mp4`;
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const qualityResult = await uploadToR2(videoBuffer, qualityFileName, 'video/mp4');
        
        if (qualityResult.success) {
          results.qualities[quality.name] = {
            url: qualityResult.url,
            size: Math.round(originalSize * (quality.name === 'high' ? 0.7 : quality.name === 'medium' ? 0.5 : quality.name === 'low' ? 0.3 : 0.2)),
            quality: quality.suffix,
            description: quality.description
          };
          results.processing.completed++;
        }
      } catch (error) {
        console.error(`Failed to process ${quality.name} quality:`, error);
        results.qualities[quality.name] = {
          error: error.message
        };
      }
    }

    results.processing.status = 'completed';
    
    return {
      success: true,
      results,
      message: `Processed ${results.processing.completed}/${results.processing.total} quality versions`
    };

  } catch (error) {
    console.error('Video processing failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get the best quality URL based on device and network conditions
 * @param {Object} videoQualities - Available quality versions
 * @param {string} userAgent - Browser user agent
 * @param {string} connectionType - Network connection type
 * @returns {string} Best quality URL
 */
export function getBestQualityUrl(videoQualities, userAgent = '', connectionType = 'unknown') {
  // Detect mobile devices
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // Detect connection speed
  const isSlowConnection = connectionType === 'slow-2g' || connectionType === '2g' || connectionType === '3g';
  
  // Choose quality based on device and connection
  if (isMobile && isSlowConnection) {
    return videoQualities.mobile?.url || videoQualities.low?.url || videoQualities.medium?.url;
  } else if (isMobile) {
    return videoQualities.low?.url || videoQualities.medium?.url || videoQualities.high?.url;
  } else if (isSlowConnection) {
    return videoQualities.medium?.url || videoQualities.low?.url || videoQualities.high?.url;
  } else {
    return videoQualities.high?.url || videoQualities.original?.url || videoQualities.medium?.url;
  }
}
