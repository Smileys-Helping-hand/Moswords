'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Copy, Trash2, Plus, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface ApiKey {
  id: string;
  appName: string;
  apiKey: string;
  status: string;
  createdAt: string;
  lastUsedAt?: string;
  totalRequests: number;
}

export default function ApiKeysTab() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/ecosystem/keys');
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys);
      }
    } catch (error) {
      console.error('Error fetching keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const createKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('App name is required');
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/ecosystem/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName: newKeyName }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`API key created for ${newKeyName}`);

        // Show the key details in a dialog
        alert(`
API Key Created!

App: ${newKeyName}
Key: ${data.apiKey}
Secret: ${data.apiSecret}

⚠️ IMPORTANT: Save these credentials securely. You won't see them again!

Add to your app's .env:
API_KEY=${data.apiKey}
API_SECRET=${data.apiSecret}
        `);

        setNewKeyName('');
        fetchKeys();
      }
    } catch (error) {
      toast.error('Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const deleteKey = async (keyId: string) => {
    if (!window.confirm('Are you sure? This will revoke the API key immediately.')) {
      return;
    }

    try {
      const res = await fetch(`/api/ecosystem/keys/${keyId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('API key deleted');
        fetchKeys();
      }
    } catch (error) {
      toast.error('Failed to delete key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return <div className="text-center py-12">Loading API keys...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Create New Key */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle>🔑 Create New API Key</CardTitle>
          <CardDescription>
            Generate a new API key for an app to authenticate with Second Brain
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="App name (e.g., awechat, financeplay)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createKey()}
            />
            <Button onClick={createKey} disabled={isCreating} className="gap-2">
              <Plus className="w-4 h-4" />
              {isCreating ? 'Creating...' : 'Create Key'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Keys */}
      <div>
        <h2 className="text-xl font-bold mb-4">Active Keys ({keys.length})</h2>
        <div className="space-y-3">
          {keys.length === 0 ? (
            <Card className="text-center py-8 text-muted-foreground">
              <p>No API keys created yet. Create one to get started!</p>
            </Card>
          ) : (
            keys.map((key, index) => (
              <motion.div
                key={key.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{key.appName}</h3>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className="font-mono bg-muted px-2 py-1 rounded">
                              {key.apiKey.substring(0, 12)}...
                            </span>
                            <button
                              onClick={() => copyToClipboard(key.apiKey)}
                              className="p-1 hover:bg-muted rounded"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex gap-4">
                            <span>Status: <span className="text-green-500">{key.status}</span></span>
                            <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                            <span>Requests: {key.totalRequests}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteKey(key.id)}
                        className="gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Usage Guide */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-600">📚 How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>1. Create an API key for your app</p>
          <p>2. Add to your app's .env file</p>
          <p>3. Use the key to authenticate with Second Brain endpoints</p>
          <div className="bg-muted p-3 rounded font-mono text-xs mt-4">
            {`Authorization: Bearer YOUR_API_KEY`}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
