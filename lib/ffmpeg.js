import { exec } from 'child_process';
import { mkdtempSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execAsync = promisify(exec);

// Use direct paths to avoid webpack mangling
const actualFfmpegPath = join(process.cwd(), 'node_modules/ffmpeg-static/ffmpeg');
const actualFfprobePath = join(process.cwd(), 'node_modules/ffprobe-static/bin/darwin/arm64/ffprobe');

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
