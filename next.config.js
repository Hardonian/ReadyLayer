/** @type {import('next').NextConfig} */
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
  // Ensure webhook routes preserve raw body
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Preserve raw body for webhook routes
      config.externals = [...(config.externals || []), 'bufferutil', 'utf-8-validate'];
    }
    return config;
  },
}

module.exports = nextConfig
