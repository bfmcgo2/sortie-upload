import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function isR2Configured() {
  return !!(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
    process.env.CLOUDFLARE_R2_BUCKET_NAME
  );
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cloudflare R2 configuration
const R2_CONFIG = {
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
};

const r2Client = new S3Client(R2_CONFIG);
const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'sortie-videos';

export async function POST(req) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json({ 
        error: 'Cloudflare R2 not configured. Please add environment variables.' 
      }, { status: 500 });
    }

    const { fileName, contentType, userId } = await req.json();

    if (!fileName || !contentType || !userId) {
      return NextResponse.json({ 
        error: 'fileName, contentType, and userId are required' 
      }, { status: 400 });
    }

    // Generate a unique file path
    const fileKey = `${userId}/${Date.now()}_${fileName}`;

    // Create presigned URL for PUT request (15 minutes expiration)
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(r2Client, command, { 
      expiresIn: 900 // 15 minutes
    });

    return NextResponse.json({
      success: true,
      presignedUrl,
      fileKey,
      fileName: fileKey
    });

  } catch (error) {
    console.error('Presigned URL error:', error);
    return NextResponse.json(
      { error: 'Failed to generate presigned URL', details: error.message },
      { status: 500 }
    );
  }
}

