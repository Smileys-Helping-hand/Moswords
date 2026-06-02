'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, RefreshCw, Trash2, Eye, EyeOff, Copy, CheckCircle, AlertCircle, Clock } from 'lucide-react';

// Components for each section
import ApiKeysTab from '@/components/ecosystem/api-keys-tab';
import ConnectedAppsTab from '@/components/ecosystem/connected-apps-tab';
import FriendsTab from '@/components/ecosystem/friends-tab';
import ContactsTab from '@/components/ecosystem/contacts-tab';

export default function EcosystemPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('api-keys');

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p>Loading Ecosystem...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div>
            <h1 className="text-3xl font-bold">🧠 Second Brain Ecosystem</h1>
            <p className="text-muted-foreground mt-1">
              Manage API keys, connected apps, friends, and shared contacts
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="api-keys" className="flex items-center gap-2">
              🔑 API Keys
            </TabsTrigger>
            <TabsTrigger value="apps" className="flex items-center gap-2">
              📱 Connected Apps
            </TabsTrigger>
            <TabsTrigger value="friends" className="flex items-center gap-2">
              👥 Friends
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              📇 Contacts
            </TabsTrigger>
          </TabsList>

          {/* API Keys Tab */}
          <AnimatePresence mode="wait">
            {activeTab === 'api-keys' && (
              <motion.div
                key="api-keys"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <ApiKeysTab />
              </motion.div>
            )}

            {/* Connected Apps Tab */}
            {activeTab === 'apps' && (
              <motion.div
                key="apps"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <ConnectedAppsTab />
              </motion.div>
            )}

            {/* Friends Tab */}
            {activeTab === 'friends' && (
              <motion.div
                key="friends"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <FriendsTab />
              </motion.div>
            )}

            {/* Contacts Tab */}
            {activeTab === 'contacts' && (
              <motion.div
                key="contacts"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <ContactsTab />
              </motion.div>
            )}
          </AnimatePresence>
        </Tabs>
      </div>
    </div>
  );
}
