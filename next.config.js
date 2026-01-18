/** @type {import('next').NextConfig} */

// P3-FIX: Bundle analyzer configuration (optional, only used when ANALYZE=true)
let withBundleAnalyzer = (config) => config;
try {
  if (process.env.ANALYZE === 'true') {
    withBundleAnalyzer = require('@next/bundle-analyzer')({
      enabled: true,
    });
  }
} catch (error) {
  // @next/bundle-analyzer not installed, skip bundle analysis
  console.warn('Bundle analyzer not available. Install @next/bundle-analyzer to enable: npm install --save-dev @next/bundle-analyzer');
}

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    // Only fail on errors, not warnings
    ignoreDuringBuilds: process.env.ESLINT_NO_DEV_ERRORS === 'true',
    dirs: ['app', 'components', 'lib'],
  },
  // Force middleware to use Node.js runtime (not Edge)
  // This is required because middleware uses Node.js modules (crypto, prisma, etc.)
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
  // Ensure webhook routes preserve raw body
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Preserve raw body for webhook routes
      config.externals = [...(config.externals || []), 'bufferutil', 'utf-8-validate'];
    }
    return config;
  },
}

module.exports = withBundleAnalyzer(nextConfig)
