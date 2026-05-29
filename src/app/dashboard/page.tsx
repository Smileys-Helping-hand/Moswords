'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import LoadingScreen from '@/components/loading-screen';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import APIKeyManager from '@/components/APIKeyManager';
import ContactManager from '@/components/ContactManager';
import { Key, Users, Settings } from 'lucide-react';

export default function DashboardPage() {
  const { status } = useAuth();
  const router = useRouter();

  if (status === 'unauthenticated') {
    router.replace('/login');
    return <LoadingScreen />;
  }

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-3xl font-bold">Integration Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Manage API keys and sync your contacts across all services
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Tabs defaultValue="contacts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-2 rounded-lg bg-white/5 border border-border/50">
            <TabsTrigger value="contacts" className="gap-2 rounded-md">
              <Users className="w-4 h-4" />
              Contacts
            </TabsTrigger>

            <TabsTrigger value="api-keys" className="gap-2 rounded-md">
              <Key className="w-4 h-4" />
              API Keys
            </TabsTrigger>
          </TabsList>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="space-y-6">
            <ContactManager />
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api-keys" className="space-y-6">
            <APIKeyManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
