import type { NextConfig } from 'next';

/**
 * The service worker is hand-written (public/sw.js, versioned through
 * public/version.json). next-pwa used to wrap this config, but it is a webpack
 * plugin and the build runs on Turbopack, so it never generated anything.
 */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Calls need camera + mic; nothing else gets device access.
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(), payment=()' },
];

const nextConfig: NextConfig = {
  // Type errors fail the build (the codebase typechecks clean as of 2026-09-29).
  typescript: {
    ignoreBuildErrors: false,
  },
  poweredByHeader: false,
  // Allow dev server access from mobile devices on local network
  allowedDevOrigins: ['192.168.31.217', '192.168.31.217:3000'],
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' },
      // Media: S3 (current) plus older Cloudflare R2 / Vercel Blob uploads
      { protocol: 'https', hostname: '*.s3.eu-west-2.amazonaws.com', pathname: '/**' },
      { protocol: 'https', hostname: 'pub-dd2357013a2745caad95add77cf30999.r2.dev', pathname: '/**' },
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com', pathname: '/**' },
    ],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // The service worker and version file must never be cached, or clients
      // stay on an old build.
      {
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
      {
        source: '/version.json',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
    ];
  },
  turbopack: {},
};

export default nextConfig;
