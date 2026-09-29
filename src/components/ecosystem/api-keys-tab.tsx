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
  keyPrefix?: string | null;
  permissions?: string[];
  status: string;
  createdAt: string;
  lastUsedAt?: string;
  totalRequests: number;
}

const SCOPES = [
  { id: 'contacts.read', help: "Read a user's synced contacts and AwehChat connections" },
  { id: 'contacts.write', help: 'Add, update and delete contacts on behalf of a user' },
  { id: 'friends.read', help: "List a user's friends and pending requests" },
  { id: 'friends.write', help: 'Send and answer friend requests on behalf of a user' },
  { id: 'profile.read', help: 'Look up whether an email has an AwehChat account' },
];

export default function ApiKeysTab() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [scopes, setScopes] = useState<string[]>(['contacts.read', 'profile.read']);
  const [revealed, setRevealed] = useState<{ appName: string; apiKey: string } | null>(null);

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
        body: JSON.stringify({ appName: newKeyName.trim(), permissions: scopes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create API key');

      // Shown once, in the page — the server only keeps a hash.
      setRevealed({ appName: newKeyName.trim(), apiKey: data.apiKey });
      setNewKeyName('');
      fetchKeys();
    } catch (error) {
      toast.error((error as Error).message || 'Failed to create API key');
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
            Issue a key for an ecosystem app. Pick only the permissions it needs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="App name (e.g., nexus, financeplay)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createKey()}
            />
            <Button onClick={createKey} disabled={isCreating} className="gap-2">
              <Plus className="w-4 h-4" />
              {isCreating ? 'Creating...' : 'Create Key'}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {SCOPES.map((scope) => (
              <label key={scope.id} className="flex items-center gap-1.5 cursor-pointer" title={scope.help}>
                <input
                  type="checkbox"
                  checked={scopes.includes(scope.id)}
                  onChange={(e) =>
                    setScopes((prev) =>
                      e.target.checked ? [...prev, scope.id] : prev.filter((s) => s !== scope.id),
                    )
                  }
                />
                <span className="font-mono text-xs">{scope.id}</span>
              </label>
            ))}
          </div>
          {revealed && (
            <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
              <p className="text-sm font-medium">
                Key for {revealed.appName} — copy it now. It is stored hashed and can&apos;t be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-muted px-2 py-1 text-xs">{revealed.apiKey}</code>
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(revealed.apiKey)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Send it as <code>Authorization: Bearer &lt;key&gt;</code>. See /api/v1 docs in ECOSYSTEM_API.md.
              </p>
              <Button size="sm" variant="ghost" onClick={() => setRevealed(null)}>I&apos;ve saved it</Button>
            </div>
          )}
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
                            <span className="font-mono bg-muted px-2 py-1 rounded" title="Keys are stored hashed; the full key was shown once at creation">
                              {key.keyPrefix ?? 'legacy key'}…
                            </span>
                            {key.permissions && key.permissions.length > 0 && (
                              <span className="text-xs">{key.permissions.join(' · ')}</span>
                            )}
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
