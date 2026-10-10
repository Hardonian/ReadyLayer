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
  typescript: {
    ignoreBuildErrors: false,
  },
  // Turbopack configuration (Next.js 16+)
  turbopack: {
    root: __dirname,
  },
  // Force middleware to use Node.js runtime (not Edge)
  // This is required because middleware uses Node.js modules (crypto, prisma, etc.)
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Performance optimizations
  poweredByHeader: false,
  compress: true,
  // Image optimization for Vercel
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  // Output configuration: allow standalone for self-hosted Docker while keeping Vercel default
  output: process.env.OUTPUT_STANDALONE === 'true' ? 'standalone' : undefined,
  
  // Logging
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },
  async redirects() {
    return [
      { source: '/pricing', destination: '/enterprise', permanent: false },
      { source: '/features', destination: '/open-source', permanent: false },
      { source: '/features/oss-maintainers', destination: '/open-source', permanent: false },
      { source: '/features/startup-ctos', destination: '/open-source', permanent: false },
      { source: '/marketplace', destination: '/integrations', permanent: false },
      { source: '/marketplace/integrations', destination: '/integrations', permanent: false },
      { source: '/marketplace/policies', destination: '/governance', permanent: false },
      { source: '/help', destination: '/docs', permanent: false },
      { source: '/help/:path*', destination: '/docs', permanent: false },
    ];
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
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-inline for hydration
              "style-src 'self' 'unsafe-inline'", // Required for CSS-in-JS and Tailwind
              "img-src 'self' data: https: blob:", // Allow images from CDNs and data URIs
              "font-src 'self' data:", // Allow fonts
              // Allow Supabase and Stripe API calls; the local mock auth stub
              // used by the E2E suite is permitted outside production only
              `connect-src 'self' https://*.supabase.co https://api.stripe.com${
                process.env.NODE_ENV === 'production' ? '' : ' http://127.0.0.1:54321 http://localhost:54321'
              }`,
              "frame-src 'self' https://js.stripe.com", // Allow Stripe checkout frames
              "object-src 'none'", // Block plugins
              "base-uri 'self'", // Restrict base tag
              "form-action 'self'", // Restrict form actions
              "frame-ancestors 'none'", // Same as X-Frame-Options DENY
              // Upgrade HTTP to HTTPS. Only applied in production: WebKit
              // implements upgrade-insecure-requests WITHOUT the CSP3
              // "potentially trustworthy host" exemption (Chromium honors
              // it), so in dev it rewrites the E2E auth-stub fetches from
              // http://localhost:54321 to https and breaks every webkit
              // test with 'TLS handshake: unexpected packet' — while the
              // dev connect-src line above explicitly allowlists those
              // http stub origins. Production config is unchanged.
              ...(process.env.NODE_ENV === 'production'
                ? ["upgrade-insecure-requests"]
                : []),
            ].join('; '),
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
