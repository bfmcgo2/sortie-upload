/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure ffmpeg and ffprobe binaries are included in serverless functions
  // In Next.js 15, this moved from experimental.serverComponentsExternalPackages
  serverExternalPackages: ['ffmpeg-static', 'ffprobe-static'],
  // Include binary files in the output for API routes
  outputFileTracingIncludes: {
    '/api/process': [
      './node_modules/ffmpeg-static/**/*',
      './node_modules/ffprobe-static/**/*',
    ],
    '/api/upload': [
      './node_modules/ffmpeg-static/**/*',
      './node_modules/ffprobe-static/**/*',
    ],
  },
};

export default nextConfig;
