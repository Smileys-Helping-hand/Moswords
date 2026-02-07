import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/providers/auth-provider';
import { UnreadProvider } from '@/providers/unread-provider';
import NotificationManager from '@/components/notification-manager';
import MobileNav from '@/components/mobile-nav';
import InstallPrompt from '@/components/install-prompt';

export const viewport: Viewport = {
  themeColor: '#030014',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Moswords - Professional Team Communication',
  description: 'Real-time collaboration platform with AI-powered features, messaging, and team workspaces',
  manifest: '/manifest.json',
  applicationName: 'Moswords',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Moswords',
    startupImage: [
      { url: '/icon-192.png' },
      { url: '/icon-512.png' },
    ],
  },
  icons: [
    { rel: 'icon', url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { rel: 'icon', url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { rel: 'apple-touch-icon', url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { rel: 'shortcut icon', url: '/favicon.ico' },
  ],
  themeColor: '#030014',
  openGraph: {
    title: 'Moswords - Professional Team Communication',
    description: 'Real-time collaboration platform with AI-powered features',
    images: [
      {
        url: '/icon-512.png',
        width: 512,
        height: 512,
      },
    ],
    type: 'website',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'format-detection': 'telephone=no',
    'mobile-web-app-capable': 'yes',
    'x-ua-compatible': 'IE=edge',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-body antialiased overflow-x-hidden max-w-full pb-20 md:pb-0">
        <AuthProvider>
          <UnreadProvider>
            {children}
            <NotificationManager />
            <MobileNav />
            <InstallPrompt />
          </UnreadProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
