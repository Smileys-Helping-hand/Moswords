import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/providers/auth-provider';
import { UnreadProvider } from '@/providers/unread-provider';
import NotificationManager from '@/components/notification-manager';

export const metadata: Metadata = {
  title: 'Moswords - Professional Team Communication',
  description: 'Real-time collaboration platform with AI-powered features',
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
