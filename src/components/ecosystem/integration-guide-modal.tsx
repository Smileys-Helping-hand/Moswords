'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Copy } from 'lucide-react';

interface IntegrationGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function IntegrationGuideModal({ open, onOpenChange }: IntegrationGuideModalProps) {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const codeExamples = {
    env: `SECOND_BRAIN_API_URL=https://api.awechat.co.za
SECOND_BRAIN_MASTER_TOKEN=a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3`,

    helper: `// src/lib/second-brain.ts
const API_URL = process.env.SECOND_BRAIN_API_URL;
const MASTER_TOKEN = process.env.SECOND_BRAIN_MASTER_TOKEN;

export async function verifyUser() {
  const res = await fetch(\`\${API_URL}/api/second-brain/auth/me\`, {
    headers: { Authorization: \`Bearer \${MASTER_TOKEN}\` },
  });
  return res.json();
}

export async function getContacts() {
  const res = await fetch(\`\${API_URL}/api/second-brain/contacts\`, {
    headers: {
      Authorization: \`Bearer \${MASTER_TOKEN}\`,
      'X-App-Name': 'your-app',
    },
  });
  return res.json();
}`,

    usage: `import { verifyUser, getContacts } from '@/lib/second-brain';

export default function App() {
  useEffect(() => {
    // Verify user with Second Brain
    verifyUser().then(user => {
      console.log('User:', user);
    });

    // Get shared contacts
    getContacts().then(data => {
      console.log('Contacts:', data.contacts);
    });
  }, []);

  return <div>Connected to Second Brain!</div>;
}`,

    health: `curl https://api.awechat.co.za/api/second-brain/health`,

    auth: `curl -H "Authorization: Bearer a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3" \\
  https://api.awechat.co.za/api/second-brain/auth/me`,

    contacts: `curl -H "Authorization: Bearer a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3" \\
  -H "X-App-Name: your-app" \\
  https://api.awechat.co.za/api/second-brain/contacts`,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📖 Second Brain Integration Guide</DialogTitle>
          <DialogDescription>
            Complete guide to integrating your app with the Second Brain ecosystem
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="quickstart" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="quickstart">Quick Start</TabsTrigger>
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="api">API Reference</TabsTrigger>
            <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
          </TabsList>

          {/* QUICK START */}
          <TabsContent value="quickstart" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>5-Minute Integration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Step 1: Add Environment Variables</h3>
                  <div className="bg-muted p-3 rounded font-mono text-xs space-y-2">
                    {codeExamples.env.split('\n').map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(codeExamples.env)}
                      className="mt-2"
                    >
                      <Copy className="w-3 h-3 mr-2" />
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Step 2: Create Helper Functions</h3>
                  <p className="text-sm text-muted-foreground">
                    See the Setup tab for full code example
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Step 3: Use in Your Components</h3>
                  <p className="text-sm text-muted-foreground">
                    See the Setup tab for component example
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Step 4: Deploy</h3>
                  <p className="text-sm text-muted-foreground">
                    Set the same environment variables in Vercel dashboard, then deploy
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SETUP */}
          <TabsContent value="setup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Environment Setup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-muted p-3 rounded font-mono text-xs space-y-2 overflow-x-auto">
                  {codeExamples.env.split('\n').map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(codeExamples.env)}
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy All
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Helper Functions (src/lib/second-brain.ts)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-muted p-3 rounded font-mono text-xs space-y-1 overflow-x-auto max-h-64 overflow-y-auto">
                  {codeExamples.helper.split('\n').map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(codeExamples.helper)}
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Code
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Component Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-muted p-3 rounded font-mono text-xs space-y-1 overflow-x-auto max-h-64 overflow-y-auto">
                  {codeExamples.usage.split('\n').map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(codeExamples.usage)}
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Code
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API REFERENCE */}
          <TabsContent value="api" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Health Check (No Auth)</CardTitle>
                <CardDescription>Test if the API is accessible</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  {codeExamples.health}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(codeExamples.health)}
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>/api/second-brain/auth/me</CardTitle>
                <CardDescription>Verify user identity with master token</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  {codeExamples.auth}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(codeExamples.auth)}
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>/api/second-brain/contacts</CardTitle>
                <CardDescription>Get shared contacts from all apps</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-muted p-3 rounded font-mono text-xs">
                  {codeExamples.contacts}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(codeExamples.contacts)}
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TROUBLESHOOTING */}
          <TabsContent value="troubleshooting" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Common Issues</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">❌ 401 Unauthorized</h4>
                  <p className="text-sm text-muted-foreground">
                    Your master token is missing or invalid. Check that SECOND_BRAIN_MASTER_TOKEN
                    is set correctly in your .env file.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">❌ Connection Refused</h4>
                  <p className="text-sm text-muted-foreground">
                    The API URL is incorrect or the server is down. Verify that
                    SECOND_BRAIN_API_URL is set to https://api.awechat.co.za
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">❌ CORS Error</h4>
                  <p className="text-sm text-muted-foreground">
                    Make sure you're using the correct headers. Include Authorization header
                    with Bearer token.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">✅ Testing Locally</h4>
                  <p className="text-sm text-muted-foreground">
                    For local development, use http://localhost:3000 as the API URL instead.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
