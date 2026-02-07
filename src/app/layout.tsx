import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/providers/auth-provider';
import { UnreadProvider } from '@/providers/unread-provider';
import NotificationManager from '@/components/notification-manager';

export const viewport: Viewport = {
  themeColor: '#030014',
};

export const metadata: Metadata = {
  title: 'Moswords - Professional Team Communication',
  description: 'Real-time collaboration platform with AI-powered features',
  manifest: '/manifest.json',
  icons: [
    { rel: 'icon', url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { rel: 'icon', url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { rel: 'apple-touch-icon', url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
  ],
  themeColor: '#030014',
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-body antialiased">
        <AuthProvider>
          <UnreadProvider>
            {children}
            <NotificationManager />
          </UnreadProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
