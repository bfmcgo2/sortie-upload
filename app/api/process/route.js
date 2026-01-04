import { NextResponse } from 'next/server';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFile, readFile } from 'fs/promises';
import { createWorkDir, extractFirstSubtitleStream, compressVideoForWhisper, convertMovToMp4 } from '../../../lib/ffmpeg.js';
import { transcribeWithWhisper, extractLocationsWithTimestamps } from '../../../lib/openai.js';
import { geocodeLocations } from '../../../lib/geocode.js';
import SRTParser2 from 'srt-parser-2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  console.log('=== API ROUTE START ===');
  try {
    console.log('Getting form data...');
    const formData = await req.formData();
    console.log('FormData received:', formData);
    
    const file = formData.get('file');
    const generalLocationsStr = formData.get('generalLocations');
    const generalLocations = JSON.parse(generalLocationsStr || '[]');
    
    console.log('File from formData:', file);
    console.log('File type:', typeof file);
    console.log('File constructor:', file?.constructor?.name);
    console.log('General locations:', generalLocations);
    
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
    if (!generalLocations.length) return NextResponse.json({ error: 'No general locations provided' }, { status: 400 });
    
    console.log('Converting to array buffer...');
    const arrayBuffer = await file.arrayBuffer();
    console.log('Array buffer size:', arrayBuffer.byteLength);
    
    const buffer = Buffer.from(arrayBuffer);
    console.log('Buffer created, size:', buffer.length);

    console.log('Creating work directory...');
    const workdir = createWorkDir();
    console.log('Work directory created:', workdir);
    
    // Get original file extension
    const originalExt = file.name.split('.').pop().toLowerCase();
    const inputPath = join(workdir, `input.${originalExt}`);
    console.log('Input path:', inputPath);
    console.log('Original file extension:', originalExt);
    
    console.log('Writing file to disk...');
    await writeFile(inputPath, buffer);
    console.log('File written successfully');

    // Step 1: Try CC extraction
    console.log('Starting CC extraction...');
    const srtPath = join(workdir, 'captions.srt');
    console.log('SRT path:', srtPath);
    console.log('About to call extractFirstSubtitleStream...');
    const cc = await extractFirstSubtitleStream(inputPath, srtPath);
    console.log('CC extraction result:', cc);
    let transcriptText = '';
    let segments = [];
    if (cc.success) {
      const srtText = await readFile(srtPath, 'utf8');
      const parser = new SRTParser2();
      const cues = parser.fromSrt(srtText) || [];
      segments = cues.map((c) => ({
        start: timeToSeconds(c.startTime),
        end: timeToSeconds(c.endTime),
        text: c.text
      }));
    } else {
      // Step 2: Whisper transcription with segments
      console.log('No CC found, trying Whisper transcription');
      console.log('Input path:', inputPath);
      console.log('File size:', buffer.length, 'bytes');
      
      let transcriptionPath = inputPath;
      
      // Always convert .mov files to .mp4 for Whisper compatibility
      if (originalExt === 'mov') {
        console.log('Converting .mov to .mp4 for Whisper compatibility...');
        const mp4Path = join(workdir, 'converted.mp4');
        const conversion = await convertMovToMp4(inputPath, mp4Path);
        if (conversion.success) {
          transcriptionPath = mp4Path;
          console.log('Successfully converted .mov to .mp4');
        } else {
          console.log('Conversion failed, trying original file');
        }
      }
      
      // Check if file exceeds OpenAI's 25MB limit
      const OPENAI_SIZE_LIMIT = 25 * 1024 * 1024; // 25MB
      if (buffer.length > OPENAI_SIZE_LIMIT) {
        console.log('File exceeds 25MB limit, compressing...');
        const compressedPath = join(workdir, 'compressed.mp3');
        const compression = await compressVideoForWhisper(transcriptionPath, compressedPath);
        if (compression.success) {
          transcriptionPath = compressedPath;
          console.log('Using compressed file for transcription');
        } else {
          return NextResponse.json({ error: `File too large (${Math.round(buffer.length/1024/1024)}MB) and compression failed: ${compression.error}` }, { status: 413 });
        }
      }
      
      try {
        const transcription = await transcribeWithWhisper(transcriptionPath);
        console.log('Whisper transcription successful:', !!transcription);
        const segs = transcription.segments || [];
        console.log('Segments found:', segs.length);
        segments = segs.map((s) => ({ start: s.start, end: s.end, text: s.text }));
      } catch (whisperError) {
        console.error('Whisper transcription failed:', whisperError);
        console.error('Full error object:', JSON.stringify(whisperError, null, 2));
        return NextResponse.json({ error: `Transcription failed: ${whisperError.message}` }, { status: 500 });
      }
    }

    transcriptText = segments
      .map((s) => `[${s.start}->${s.end}] ${s.text}`)
      .join('\n');

    console.log('Transcript length:', transcriptText.length);
    console.log('First 500 chars:', transcriptText.slice(0, 500));

    // Step 3: NER via OpenAI
    console.log('Starting location extraction...');
    const extracted = await extractLocationsWithTimestamps(transcriptText, generalLocations);
    console.log('Locations extracted:', extracted.length);
    console.log('Extracted items:', extracted);

    // Step 4: Geocode
    console.log('Starting geocoding...');
    const geocoded = await geocodeLocations(extracted, generalLocations);
    console.log('Geocoded items:', geocoded.length);
    console.log('Final results:', geocoded);

    return NextResponse.json({ 
      generalLocations: generalLocations,
      locations: geocoded,
      transcript: transcriptText,
      extractedLocations: extracted,
      debug: {
        segmentCount: segments.length,
        transcriptLength: transcriptText.length,
        locationsFound: extracted.length,
        geocodedCount: geocoded.length
      }
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function timeToSeconds(hhmmss) {
  const [h, m, s] = hhmmss.split(':');
  return Number(h) * 3600 + Number(m) * 60 + Number(s.replace(',', '.'));
}
