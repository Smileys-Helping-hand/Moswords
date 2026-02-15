import type {NextConfig} from 'next';

// Mobile-specific Next.js config for Capacitor
const nextConfig: NextConfig = {
  output: 'export',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Disable features not supported in static export
  trailingSlash: true,
  // Configure base path if needed
  // basePath: '',
  distDir: 'out',
};

export default nextConfig;
