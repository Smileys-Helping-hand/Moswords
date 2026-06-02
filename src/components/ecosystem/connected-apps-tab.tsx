'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface AppStatus {
  id: string;
  appName: string;
  status: 'connected' | 'error' | 'disabled';
  lastHealthCheck: string;
  lastError?: string;
  consecutiveErrors: number;
  metadata: any;
}

export default function ConnectedAppsTab() {
  const [apps, setApps] = useState<AppStatus[]>([]);
  const [health, setHealth] = useState({ connected: 0, error: 0, disabled: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/ecosystem/apps/status');
      if (res.ok) {
        const data = await res.json();
        setApps(data.apps);
        setHealth(data.health);
      }
    } catch (error) {
      console.error('Error fetching app status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading app status...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Health Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-500">{health.connected}</div>
            <p className="text-sm text-muted-foreground">Connected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-yellow-500">{health.error}</div>
            <p className="text-sm text-muted-foreground">Error</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-gray-500">{health.disabled}</div>
            <p className="text-sm text-muted-foreground">Disabled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">{health.total}</div>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Apps List */}
      <div>
        <h2 className="text-xl font-bold mb-4">Connected Apps</h2>
        <div className="space-y-3">
          {apps.length === 0 ? (
            <Card className="text-center py-8 text-muted-foreground">
              <p>No apps connected yet. Create an API key to connect an app!</p>
            </Card>
          ) : (
            apps.map((app, index) => {
              const statusIcon =
                app.status === 'connected' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : app.status === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Clock className="w-5 h-5 text-gray-500" />
                );

              return (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {statusIcon}
                          <div>
                            <h3 className="font-semibold">{app.appName}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Last check: {new Date(app.lastHealthCheck).toLocaleString()}
                            </p>
                            {app.lastError && (
                              <p className="text-sm text-red-500 mt-1">{app.lastError}</p>
                            )}
                            {app.consecutiveErrors > 0 && (
                              <p className="text-sm text-yellow-600 mt-1">
                                {app.consecutiveErrors} consecutive error(s)
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-muted">
                          {app.status}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
