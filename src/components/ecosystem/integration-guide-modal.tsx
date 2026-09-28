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
    env: `AWEHCHAT_API_URL=https://awehchat.co.za
AWEHCHAT_API_KEY=<key issued on /ecosystem — shown once>`,

    helper: `// src/lib/awehchat.ts — server-side only; never ship the key to browsers
const API_URL = process.env.AWEHCHAT_API_URL;
const API_KEY = process.env.AWEHCHAT_API_KEY;

async function call(path: string, userEmail: string, init: RequestInit = {}) {
  const res = await fetch(\`\${API_URL}/api/v1\${path}\`, {
    ...init,
    headers: {
      Authorization: \`Bearer \${API_KEY}\`,
      'X-User-Email': userEmail,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(\`AwehChat \${res.status}\`);
  return res.json();
}

// Full book first, then only changes: keep nextCursor per user.
export const getContacts = (userEmail: string, cursor?: string) =>
  call(\`/contacts\${cursor ? \`?cursor=\${cursor}\` : ''}\`, userEmail);

export const pushContacts = (userEmail: string, contacts: object[]) =>
  call('/contacts', userEmail, { method: 'POST', body: JSON.stringify({ contacts }) });`,

    usage: `// e.g. in a server action or API route
const { contacts, nextCursor } = await getContacts(user.email);
await saveCursor(user.id, nextCursor);

await pushContacts(user.email, [
  { externalId: 'crm-42', name: 'Thandi M', email: 'thandi@example.com', phone: '+27 82 555 0101' },
]);`,

    health: `curl https://awehchat.co.za/api/v1/health`,

    auth: `curl -H "Authorization: Bearer $AWEHCHAT_API_KEY" \
  -H "X-User-Email: someone@example.com" \
  https://awehchat.co.za/api/v1/connections`,

    contacts: `curl -H "Authorization: Bearer $AWEHCHAT_API_KEY" \
  -H "X-User-Email: someone@example.com" \
  "https://awehchat.co.za/api/v1/contacts?include=connections"`,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📖 AwehChat Contacts API — integration guide</DialogTitle>
          <DialogDescription>
            Connect an ecosystem app to AwehChat, the shared contact book and messaging hub
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
                <CardDescription>List a user's AwehChat connections</CardDescription>
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
                    Your app key is missing, revoked or lacks the needed permission. Check that AWEHCHAT_API_KEY
                    is set correctly in your .env file.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">❌ Connection Refused</h4>
                  <p className="text-sm text-muted-foreground">
                    The API URL is incorrect or the server is down. Verify that
                    AWEHCHAT_API_URL is set to https://awehchat.co.za
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
