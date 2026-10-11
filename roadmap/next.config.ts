import path from 'path';
import type { NextConfig } from 'next';

const basePath = process.env.NEXT_BASE_PATH || '';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(__dirname),
  // Local compose serves the app at https://docs.practera.local/roadmap/.
  // Production leaves NEXT_BASE_PATH unset, so roadmap.practera.com stays at /.
  ...(basePath ? { basePath } : {}),
  allowedDevOrigins: ['docs.practera.local', 'roadmap.practera.local'],
  turbopack: {
    // No custom rules needed — Turbopack handles watch ignores natively.
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate, max-age=0' },
        ],
      },
    ];
  },
};

export default nextConfig;
