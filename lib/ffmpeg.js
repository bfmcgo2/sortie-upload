import { exec } from 'child_process';
import { mkdtempSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execAsync = promisify(exec);

// Import the platform-specific binaries (automatically detects OS)
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

// Use platform-specific paths
// ffmpeg-static exports the path directly as a string
// ffprobe-static exports an object with a path property
const actualFfmpegPath = ffmpegPath;
const actualFfprobePath = ffprobeStatic.path || ffprobeStatic;

export function createWorkDir(prefix = 'scan-') {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  return dir;
}

export async function probeStreams(inputPath) {
  console.log('=== FFMPEG probeStreams ===');
  console.log('inputPath:', inputPath, 'type:', typeof inputPath);
  console.log('ffprobePath:', actualFfprobePath);
  
  try {
    // Use ffprobe directly to get JSON output
    const command = `"${actualFfprobePath}" -v quiet -print_format json -show_format -show_streams "${inputPath}"`;
    console.log('Executing command:', command);
    
    const { stdout } = await execAsync(command);
    console.log('ffprobe stdout length:', stdout.length);
    
    const data = JSON.parse(stdout);
    console.log('ffprobe success, streams:', data.streams?.length || 0);
    return data;
  } catch (error) {
    console.error('ffprobe error:', error);
    throw error;
  }
}

export async function extractFirstSubtitleStream(inputPath, srtOutPath) {
  console.log('=== FFMPEG extractFirstSubtitleStream ===');
  console.log('inputPath:', inputPath, 'type:', typeof inputPath);
  console.log('srtOutPath:', srtOutPath, 'type:', typeof srtOutPath);
  
  console.log('Calling probeStreams...');
  const info = await probeStreams(inputPath);
  console.log('Probe streams result:', info ? 'success' : 'failed');
  
  const subtitleStreams = (info.streams || []).filter((s) => s.codec_type === 'subtitle');
  console.log('Subtitle streams found:', subtitleStreams.length);
  if (!subtitleStreams.length) {
    return { success: false, reason: 'no_subtitle_streams' };
  }
  
  // Try each subtitle stream until one succeeds
  for (let idx = 0; idx < subtitleStreams.length; idx += 1) {
    try {
      console.log(`Trying subtitle stream ${idx}...`);
      const command = `"${actualFfmpegPath}" -i "${inputPath}" -map 0:s:${idx} "${srtOutPath}"`;
      console.log('Executing ffmpeg command:', command);
      
      await execAsync(command);
      
      if (existsSync(srtOutPath)) {
        console.log(`Successfully extracted subtitle stream ${idx}`);
        return { success: true, streamIndexTried: idx };
      }
    } catch (error) {
      console.log(`Subtitle stream ${idx} failed:`, error.message);
      // try next stream
    }
  }
  return { success: false, reason: 'extract_failed' };
}

export async function compressVideoForWhisper(inputPath, outputPath) {
  console.log('=== FFMPEG compressVideoForWhisper ===');
  console.log('Compressing video to meet OpenAI 25MB limit...');
  
  try {
    // Compress video to reduce file size - lower quality, audio focus
    const command = `"${actualFfmpegPath}" -i "${inputPath}" -vn -acodec mp3 -ar 16000 -ab 32k "${outputPath}"`;
    console.log('Compression command:', command);
    
    await execAsync(command);
    console.log('Video compression completed');
    return { success: true };
  } catch (error) {
    console.error('Video compression failed:', error);
    return { success: false, error: error.message };
  }
}

export async function compressVideoForMobile(inputPath, outputPath) {
  console.log('=== FFMPEG compressVideoForMobile ===');
  console.log('Compressing video for web optimization...');
  
  try {
    // Web-optimized compression: maintain quality while reducing size
    // - Scale to 1080p max (or keep original if smaller)
    // - Use CRF 23 for good quality (lower = better quality)
    // - Fast preset for speed
    // - AAC audio at 128k
    // - Fast start for web streaming
    const command = `"${actualFfmpegPath}" -i "${inputPath}" -vf "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -movflags +faststart "${outputPath}"`;
    console.log('Web compression command:', command);
    
    await execAsync(command);
    console.log('Web video compression completed');
    return { success: true };
  } catch (error) {
    console.error('Web video compression failed:', error);
    return { success: false, error: error.message };
  }
}

export async function convertMovToMp4(inputPath, outputPath) {
  console.log('=== FFMPEG convertMovToMp4 ===');
  console.log('Converting .mov to .mp4 for Whisper compatibility...');
  
  try {
    // Simple conversion from .mov to .mp4 without quality loss
    // - Copy video and audio streams without re-encoding
    // - This is fast and maintains original quality
    const command = `"${actualFfmpegPath}" -i "${inputPath}" -c copy "${outputPath}"`;
    console.log('Conversion command:', command);
    
    await execAsync(command);
    console.log('MOV to MP4 conversion completed');
    return { success: true };
  } catch (error) {
    console.error('MOV to MP4 conversion failed:', error);
    return { success: false, error: error.message };
  }
}
