import type {NextConfig} from 'next';
// @ts-ignore – next-pwa has no bundled type declarations
import withPWA from 'next-pwa';

const isMobileBuild = process.env.NEXT_MOBILE === 'true';

const nextConfig: NextConfig = {
  // Standard server build (Vercel, Railway, etc.).
  // Set NEXT_MOBILE=true to produce a static export for bundling in the APK.
  // NOTE: static export requires removing force-dynamic from all API routes first.
  // ...(isMobileBuild ? { output: 'export' } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  // Allow dev server access from mobile devices on local network
  allowedDevOrigins: ['192.168.31.217', '192.168.31.217:3000'],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        // Cloudflare R2 public URL
        protocol: 'https',
        hostname: 'pub-dd2357013a2745caad95add77cf30999.r2.dev',
        port: '',
        pathname: '/**',
      },
    ],
  },
  turbopack: {},
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Disable PWA SW generation for mobile static-export builds (CapacitorHttp handles networking)
  disable: process.env.NODE_ENV === 'development' || isMobileBuild,
})(nextConfig);
