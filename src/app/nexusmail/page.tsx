'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Mail, Plus, Copy, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface RegisteredApp {
  id: string;
  name: string;
  apiKey: string;
  status: string;
  emailsSent: number;
  createdAt: string;
}

interface EmailLog {
  id: string;
  appSource: string;
  recipient: string;
  templateId: string;
  status: string;
  timestamp: string;
  errorMessage?: string;
}

export default function NexusMailDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [apps, setApps] = useState<RegisteredApp[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAppName, setNewAppName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, router]);

  const fetchData = async () => {
    try {
      const [appsRes, logsRes] = await Promise.all([
        fetch('/api/nexusmail/apps'),
        fetch('/api/nexusmail/logs?limit=50'),
      ]);

      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setApps(appsData.apps || []);
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load dashboard data',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterApp = async () => {
    if (!newAppName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter an app name',
      });
      return;
    }

    try {
      const response = await fetch('/api/nexusmail/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAppName }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success!',
          description: `App "${data.app.name}" registered successfully`,
        });
        setApps([...apps, data.app]);
        setNewAppName('');
        setIsDialogOpen(false);
      } else {
        throw new Error(data.error || 'Failed to register app');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  const copyToClipboard = (text: string, appId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(appId);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({
      title: 'Copied!',
      description: 'API key copied to clipboard',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'suspended':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'inactive':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      case 'sent':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 p-4 md:p-8 pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            {/* Mobile back button */}
            <Button 
              onClick={() => router.push('/')} 
              variant="ghost" 
              size="icon"
              className="md:hidden shrink-0 w-10 h-10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                <Mail className="w-6 h-6 md:w-10 md:h-10 text-purple-400 shrink-0" />
                <h1 className="text-xl sm:text-2xl md:text-4xl font-bold text-white">NexusMail Dashboard</h1>
              </div>
              <p className="text-sm md:text-base text-muted-foreground">
                Manage your email service integrations and monitor delivery
              </p>
            </div>
          </div>
          {/* Desktop back button */}
          <Button onClick={() => router.push('/')} variant="outline" className="hidden md:flex">
            Back to App
          </Button>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-panel border-purple-500/20">
              <CardHeader className="pb-2 md:pb-4">
                <CardTitle className="text-white text-base md:text-lg">Total Apps</CardTitle>
                <CardDescription className="text-sm">Registered applications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl md:text-4xl font-bold text-purple-400">{apps.length}</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-panel border-blue-500/20">
              <CardHeader className="pb-2 md:pb-4">
                <CardTitle className="text-white text-base md:text-lg">Emails Sent</CardTitle>
                <CardDescription className="text-sm">Total across all apps</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl md:text-4xl font-bold text-blue-400">
                  {apps.reduce((sum, app) => sum + app.emailsSent, 0)}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass-panel border-green-500/20">
              <CardHeader className="pb-2 md:pb-4">
                <CardTitle className="text-white text-base md:text-lg">Success Rate</CardTitle>
                <CardDescription className="text-sm">Last 50 emails</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl md:text-4xl font-bold text-green-400">
                  {logs.length > 0
                    ? Math.round(
                        (logs.filter((l) => l.status === 'sent').length / logs.length) * 100
                      )
                    : 0}
                  %
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Connected Ecosystem */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass-panel border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Connected Ecosystem</CardTitle>
                  <CardDescription>Registered applications and their API keys</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-purple-500 hover:bg-purple-600">
                      <Plus className="w-4 h-4 mr-2" />
                      Register New App
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-panel border-purple-500/20">
                    <DialogHeader>
                      <DialogTitle className="text-white">Register New App</DialogTitle>
                      <DialogDescription>
                        Create a new API key for your application
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="appName" className="text-white">
                          App Name
                        </Label>
                        <Input
                          id="appName"
                          placeholder="My Awesome App"
                          value={newAppName}
                          onChange={(e) => setNewAppName(e.target.value)}
                          className="mt-2"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleRegisterApp}
                        className="bg-purple-500 hover:bg-purple-600"
                      >
                        Register
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {apps.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No apps registered yet. Click "Register New App" to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-white">App Name</TableHead>
                      <TableHead className="text-white">API Key</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                      <TableHead className="text-white">Emails Sent</TableHead>
                      <TableHead className="text-white">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apps.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium text-white">{app.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-black/20 px-2 py-1 rounded">
                              {app.apiKey.substring(0, 20)}...
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(app.apiKey, app.id)}
                            >
                              {copiedKey === app.id ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(app.status)}>{app.status}</Badge>
                        </TableCell>
                        <TableCell className="text-white">{app.emailsSent}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(app.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Audit Log */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="glass-panel border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Audit Log</CardTitle>
              <CardDescription>Recent email delivery attempts</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No email logs yet. Logs will appear here after your first dispatch.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-white">Timestamp</TableHead>
                      <TableHead className="text-white">App Source</TableHead>
                      <TableHead className="text-white">Recipient</TableHead>
                      <TableHead className="text-white">Template</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-white">{log.appSource}</TableCell>
                        <TableCell className="text-white">{log.recipient}</TableCell>
                        <TableCell className="text-muted-foreground">{log.templateId}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(log.status)}>{log.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
