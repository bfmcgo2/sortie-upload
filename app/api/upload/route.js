import { NextResponse } from 'next/server';
import { dbHelpers, supabaseAdmin } from '../../../lib/supabase';
import { uploadToR2, isR2Configured, getR2SignedUrl } from '../../../lib/cloudflare-r2';
import { createWorkDir, compressVideoForMobile } from '../../../lib/ffmpeg';
import { writeFileSync, unlinkSync } from 'fs';

// Ensure this route runs on Node.js (not Edge) to allow large multipart uploads
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for video processing

export async function POST(req) {
  try {
    // Check content length if available
    const contentLength = req.headers.get('content-length');
    if (contentLength) {
      const sizeInMB = parseInt(contentLength) / (1024 * 1024);
      console.log(`Upload request size: ${sizeInMB.toFixed(2)} MB`);
      
      // Warn if file is very large (though compression will handle it)
      if (sizeInMB > 500) {
        console.warn(`Very large upload detected: ${sizeInMB.toFixed(2)} MB`);
      }
    }
    
    const formData = await req.formData();
    const user = JSON.parse(formData.get('user'));
    const videoData = JSON.parse(formData.get('videoData'));
    const locations = JSON.parse(formData.get('locations'));
    const videoFile = formData.get('videoFile');
    const isPublic = formData.get('isPublic') === 'true';

    if (!user || !user.email) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    }

    if (!videoData || !locations || !videoFile) {
      return NextResponse.json({ error: 'Video file, data and locations required' }, { status: 400 });
    }

    // Check if Cloudflare R2 is configured
    if (!isR2Configured()) {
      return NextResponse.json({ 
        error: 'Cloudflare R2 not configured. Please add environment variables.' 
      }, { status: 500 });
    }

    // Convert file to buffer and compress if needed
    const fileBuffer = Buffer.from(await videoFile.arrayBuffer());
    const fileExt = videoFile.name.split('.').pop().toLowerCase();
    const normalizedExt = fileExt === 'mov' ? 'mp4' : fileExt;
    
    console.log('=== VIDEO COMPRESSION DEBUG ===');
    console.log('Original file size:', videoFile.size, 'bytes');
    console.log('Original file type:', videoFile.type);
    
    let finalBuffer = fileBuffer;
    let finalMimeType = videoFile.type;
    let compressedSize = videoFile.size;
    
    // Compress video if it's larger than 50MB
    if (videoFile.size > 50 * 1024 * 1024) {
      console.log('File is large, compressing...');
      
      try {
        // Create temporary directory for compression
        const workDir = createWorkDir('compress-');
        const inputPath = `${workDir}/input.${fileExt}`;
        const outputPath = `${workDir}/compressed.mp4`;
        
        // Write original file to disk
        writeFileSync(inputPath, fileBuffer);
        
        // Compress video
        const compressionResult = await compressVideoForMobile(inputPath, outputPath);
        
        if (compressionResult.success) {
          // Read compressed file
          const compressedBuffer = require('fs').readFileSync(outputPath);
          finalBuffer = compressedBuffer;
          finalMimeType = 'video/mp4';
          compressedSize = compressedBuffer.length;
          
          console.log('Compression successful!');
          console.log('Original size:', videoFile.size, 'bytes');
          console.log('Compressed size:', compressedSize, 'bytes');
          console.log('Size reduction:', Math.round((1 - compressedSize / videoFile.size) * 100) + '%');
          
          // Clean up temporary files
          unlinkSync(inputPath);
          unlinkSync(outputPath);
        } else {
          console.log('Compression failed, using original file');
        }
      } catch (error) {
        console.error('Compression error:', error);
        console.log('Using original file due to compression error');
      }
    } else {
      console.log('File is small enough, skipping compression');
    }
    
    const fileName = `${user.id}/${Date.now()}.${normalizedExt}`;
    
    console.log('=== CLOUDFLARE R2 UPLOAD DEBUG ===');
    console.log('Final file size:', compressedSize, 'bytes');
    console.log('File name:', fileName);
    console.log('File type:', finalMimeType);
    
    // Upload to Cloudflare R2
    const uploadResult = await uploadToR2(finalBuffer, fileName, finalMimeType);
    
    if (!uploadResult.success) {
      return NextResponse.json({ error: 'Failed to upload video file to Cloudflare R2' }, { status: 500 });
    }

    // Use direct URL instead of signed URL (no expiration)
    const videoUrl = uploadResult.url;

    // Prepare video record for database
    const videoRecord = {
      user_id: user.id,
      user_email: user.email,
      user_name: user.name,
      title: videoData.title || `${user.name}'s Video`,
      description: videoData.description || null,
      video_filename: videoFile.name,
      // Use the final MIME type (may be compressed)
      video_file_type: finalMimeType,
      video_file_size: compressedSize,
      video_url: videoUrl,
      general_locations: videoData.generalLocations || [],
      transcript: videoData.transcript || null,
      processing_status: 'completed',
      is_public: isPublic
    };

    // Upload video record to database
    const uploadedVideo = await dbHelpers.uploadVideoData(videoRecord);

    // Upload locations for this video
    const uploadedLocations = await dbHelpers.uploadLocations(uploadedVideo.id, locations);

    return NextResponse.json({
      success: true,
      video: uploadedVideo,
      locations: uploadedLocations,
      message: 'Video data uploaded successfully',
      videoUrl: `/video/${uploadedVideo.id}` // Link to video player page
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload video data', details: error.message },
      { status: 500 }
    );
  }
}

// Get user's videos
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const isPublic = searchParams.get('public') === 'true';

    if (isPublic) {
      // Get public videos for mobile app
      const videos = await dbHelpers.getPublicVideos();
      return NextResponse.json({ videos });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get user's videos
    const videos = await dbHelpers.getUserVideos(userId);
    return NextResponse.json({ videos });

  } catch (error) {
    console.error('Get videos error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos', details: error.message },
      { status: 500 }
    );
  }
}
