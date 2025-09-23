import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Cloudflare R2 configuration
const R2_CONFIG = {
  region: 'auto', // Cloudflare R2 uses 'auto' region
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
};

// Create S3 client configured for Cloudflare R2
const r2Client = new S3Client(R2_CONFIG);

export const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'sortie-videos';

/**
 * Upload a file to Cloudflare R2
 * @param {Buffer|Uint8Array|Blob} fileBuffer - File data
 * @param {string} fileName - Name for the file in R2
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<Object>} Upload result
 */
export async function uploadToR2(fileBuffer, fileName, contentType) {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=3600', // Cache for 1 hour
    });

    const result = await r2Client.send(command);
    
    console.log('✅ File uploaded to Cloudflare R2:', fileName);
    console.log('ETag:', result.ETag);
    
    return {
      success: true,
      key: fileName,
      etag: result.ETag,
      url: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET_NAME}/${fileName}`
    };
  } catch (error) {
    console.error('❌ R2 upload error:', error);
    throw new Error(`Failed to upload to Cloudflare R2: ${error.message}`);
  }
}

/**
 * Generate a signed URL for accessing a file in R2
 * @param {string} fileName - Name of the file in R2
 * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>} Signed URL
 */
export async function getR2SignedUrl(fileName, expiresIn = 3600) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
    });

    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
    
    console.log('✅ Generated R2 signed URL for:', fileName);
    return signedUrl;
  } catch (error) {
    console.error('❌ R2 signed URL error:', error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
}

/**
 * Check if R2 credentials are properly configured
 * @returns {boolean} True if credentials are available
 */
export function isR2Configured() {
  return !!(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
    process.env.CLOUDFLARE_R2_BUCKET_NAME
  );
}
