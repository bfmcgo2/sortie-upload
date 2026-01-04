/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure ffmpeg and ffprobe binaries are included in serverless functions
  experimental: {
    serverComponentsExternalPackages: ['ffmpeg-static', 'ffprobe-static'],
  },
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
