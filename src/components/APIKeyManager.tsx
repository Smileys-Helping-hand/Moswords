'use client';

import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Copy, Trash2, Plus, RefreshCw, Lock, Unlock } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';

interface APIKey {
  id: string;
  name: string;
  key: string;
  maskedKey: string;
  createdAt: Date;
  lastUsed?: Date;
  isActive: boolean;
  permissions: string[];
}

/**
 * API Key Manager Component
 * Allows users to create, manage, and share API keys for integrations
 */
const APIKeyManager = memo(function APIKeyManager() {
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [generatedKey, setGeneratedKey] = useState<{ id: string; key: string } | null>(null);

  // Load API keys
  const loadAPIKeys = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/keys/api-keys');
      if (!response.ok) throw new Error('Failed to load API keys');
      const data = await response.json();
      setAPIKeys(data.keys || []);
    } catch (error) {
      console.error('Error loading API keys:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load API keys',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Create new API key
  const createAPIKey = useCallback(async () => {
    if (!newKeyName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a name for the API key',
      });
      return;
    }

    try {
      const response = await fetch('/api/keys/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (!response.ok) throw new Error('Failed to create API key');

      const data = await response.json();
      setGeneratedKey({ id: data.key.id, key: data.key.key });
      setNewKeyName('');
      setShowNewKeyForm(false);
      await loadAPIKeys();

      toast({
        title: 'API Key Created',
        description: 'Copy it now, you won\'t see it again',
      });
    } catch (error) {
      console.error('Error creating API key:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create API key',
      });
    }
  }, [newKeyName, toast, loadAPIKeys]);

  // Delete API key
  const deleteAPIKey = useCallback(
    async (keyId: string) => {
      try {
        const response = await fetch(`/api/keys/api-keys/${keyId}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Failed to delete API key');

        setAPIKeys((prev) => prev.filter((k) => k.id !== keyId));

        toast({
          title: 'API Key Deleted',
          description: 'The API key has been revoked',
        });
      } catch (error) {
        console.error('Error deleting API key:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to delete API key',
        });
      }
    },
    [toast]
  );

  // Toggle key visibility
  const toggleKeyVisibility = useCallback((keyId: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) {
        next.delete(keyId);
      } else {
        next.add(keyId);
      }
      return next;
    });
  }, []);

  // Copy to clipboard
  const copyToClipboard = useCallback(
    (text: string, label: string) => {
      navigator.clipboard.writeText(text);
      toast({
        title: 'Copied',
        description: `${label} copied to clipboard`,
      });
    },
    [toast]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API Keys</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage API keys for integrations with Nexus, Discord, and other services
          </p>
        </div>
        <Button onClick={() => setShowNewKeyForm(true)} className="gap-2 rounded-lg">
          <Plus className="w-4 h-4" />
          New Key
        </Button>
      </div>

      {/* New Key Form */}
      <AnimatePresence>
        {showNewKeyForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white/5 border border-border rounded-lg p-4 space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Key Name</label>
              <Input
                placeholder="e.g., Nexus Integration, Discord Bot"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="rounded-lg"
              />
              <p className="text-xs text-muted-foreground">
                Give your API key a descriptive name to identify its purpose
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setShowNewKeyForm(false)}
                className="rounded-lg"
              >
                Cancel
              </Button>
              <Button onClick={createAPIKey} className="rounded-lg">
                Create API Key
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated Key Display */}
      <AnimatePresence>
        {generatedKey && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <p className="font-semibold text-green-400">API Key Generated</p>
            </div>

            <div className="bg-background/50 border border-border rounded p-3 font-mono text-sm break-all">
              {generatedKey.key}
            </div>

            <p className="text-xs text-yellow-400">
              ⚠️ Save this key somewhere safe. You won't be able to see it again.
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    generatedKey.key,
                    'API Key'
                  )
                }
                className="gap-2 rounded-lg flex-1"
              >
                <Copy className="w-4 h-4" />
                Copy Key
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setGeneratedKey(null)}
                className="rounded-lg"
              >
                Done
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* API Keys List */}
      <div className="space-y-3">
        <h3 className="font-semibold">Your API Keys</h3>

        {loading ? (
          <div className="text-center text-muted-foreground py-8">
            Loading API keys...
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>No API keys yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {apiKeys.map((apiKey) => (
              <motion.div
                key={apiKey.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-border rounded-lg p-4 flex items-center justify-between group hover:bg-white/10 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{apiKey.name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="text-xs bg-background px-2 py-1 rounded font-mono">
                      {visibleKeys.has(apiKey.id) ? apiKey.key : apiKey.maskedKey}
                    </code>
                    <button
                      onClick={() => toggleKeyVisibility(apiKey.id)}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      {visibleKeys.has(apiKey.id) ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          apiKey.key,
                          'API Key'
                        )
                      }
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Created: {new Date(apiKey.createdAt).toLocaleDateString()}</span>
                    {apiKey.lastUsed && (
                      <span>Last used: {new Date(apiKey.lastUsed).toRelativeTime?.() || 'Never'}</span>
                    )}
                    <span className={`flex items-center gap-1 ${apiKey.isActive ? 'text-green-400' : 'text-red-400'}`}>
                      {apiKey.isActive ? (
                        <>
                          <Unlock className="w-3 h-3" />
                          Active
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3" />
                          Inactive
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => deleteAPIKey(apiKey.id)}
                  className="p-2 hover:bg-red-500/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete API key"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Integration Documentation */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-blue-400">Integration Guide</h3>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>Use your API key to integrate with:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Nexus Email:</strong> Sync contacts and send emails</li>
            <li><strong>Discord:</strong> Mirror chats and user status</li>
            <li><strong>Slack:</strong> Send notifications and share files</li>
            <li><strong>Custom Apps:</strong> Build integrations on our API</li>
          </ul>
        </div>
      </div>
    </div>
  );
});

APIKeyManager.displayName = 'APIKeyManager';

export default APIKeyManager;
