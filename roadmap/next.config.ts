import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(__dirname),
  // Allow the local dev domain used by the Nginx reverse proxy
  allowedDevOrigins: ['roadmap.practera.local'],
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
