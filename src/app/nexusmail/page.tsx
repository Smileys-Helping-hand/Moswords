'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Mail, Plus, Copy, Check, ArrowLeft, Bot, ShieldCheck,
  Zap, Clock, CheckCircle2, XCircle, AlertTriangle, Trash2, RefreshCw,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface RegisteredApp {
  id: string; name: string; apiKey: string;
  status: string; emailsSent: number; createdAt: string;
}
interface EmailLog {
  id: string; appSource: string; recipient: string;
  templateId: string; status: string; timestamp: string;
}
interface Approval {
  id: string; title: string; description?: string;
  requestedBy: string; appSource?: string;
  status: string; priority: string; createdAt: string; decidedAt?: string;
}

const STATUS_COLORS: Record<string, string> = {
  active:    'bg-green-500/10 text-green-500 border-green-500/20',
  suspended: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  inactive:  'bg-gray-500/10 text-gray-500 border-gray-500/20',
  sent:      'bg-blue-500/10 text-blue-500 border-blue-500/20',
  failed:    'bg-red-500/10 text-red-500 border-red-500/20',
  pending:   'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  approved:  'bg-green-500/10 text-green-500 border-green-500/20',
  rejected:  'bg-red-500/10 text-red-500 border-red-500/20',
  normal:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  high:      'bg-orange-500/10 text-orange-400 border-orange-500/20',
  urgent:    'bg-red-500/10 text-red-400 border-red-500/20',
  low:       'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

export default function CommandCenter() {
  const { status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [apps, setApps] = useState<RegisteredApp[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [approvalsList, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAppName, setNewAppName] = useState('');
  const [appDialogOpen, setAppDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [apTitle, setApTitle] = useState('');
  const [apDesc, setApDesc] = useState('');
  const [apPriority, setApPriority] = useState('normal');
  const [hermesKey, setHermesKey] = useState('');
  const [hermesRecipient, setHermesRecipient] = useState('');
  const [hermesSubject, setHermesSubject] = useState('');
  const [hermesBody, setHermesBody] = useState('');
  const [hermesSending, setHermesSending] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    else if (status === 'authenticated') fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [appsRes, logsRes, approvalsRes] = await Promise.all([
        fetch('/api/nexusmail/apps'),
        fetch('/api/nexusmail/logs?limit=50'),
        fetch('/api/approvals'),
      ]);
      if (appsRes.ok) setApps((await appsRes.json()).apps || []);
      if (logsRes.ok) setLogs((await logsRes.json()).logs || []);
      if (approvalsRes.ok) setApprovals((await approvalsRes.json()).approvals || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  const registerApp = async () => {
    if (!newAppName.trim()) return;
    const res = await fetch('/api/nexusmail/apps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newAppName }),
    });
    const data = await res.json();
    if (res.ok) {
      setApps((p) => [...p, data.app]);
      setNewAppName('');
      setAppDialogOpen(false);
      toast({ title: 'App registered!' });
    } else {
      toast({ variant: 'destructive', title: data.error || 'Failed' });
    }
  };

  const createApproval = async () => {
    if (!apTitle.trim()) return;
    const res = await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: apTitle, description: apDesc, priority: apPriority }),
    });
    const data = await res.json();
    if (res.ok) {
      setApprovals((p) => [data.approval, ...p]);
      setApTitle(''); setApDesc('');
      setApprovalDialogOpen(false);
      toast({ title: 'Approval created!' });
    } else {
      toast({ variant: 'destructive', title: data.error || 'Failed' });
    }
  };

  const decideApproval = async (id: string, decision: 'approved' | 'rejected') => {
    const res = await fetch(`/api/approvals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: decision }),
    });
    if (res.ok) {
      setApprovals((p) => p.map((a) => a.id === id ? { ...a, status: decision } : a));
      toast({ title: decision === 'approved' ? 'Approved!' : 'Rejected' });
    }
  };

  const deleteApproval = async (id: string) => {
    await fetch(`/api/approvals/${id}`, { method: 'DELETE' });
    setApprovals((p) => p.filter((a) => a.id !== id));
  };

  const sendHermes = async () => {
    if (!hermesKey || !hermesRecipient || !hermesSubject || !hermesBody) return;
    setHermesSending(true);
    const res = await fetch('/api/nexusmail/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secretKey: hermesKey,
        recipient: hermesRecipient,
        templateId: 'hermes-dispatch',
        subject: hermesSubject,
        body: hermesBody,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      toast({ title: 'Dispatched!', description: `Sent to ${hermesRecipient}` });
      setHermesRecipient(''); setHermesSubject(''); setHermesBody('');
    } else {
      toast({ variant: 'destructive', title: data.error || 'Dispatch failed' });
    }
    setHermesSending(false);
  };

  const copyKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const pending = approvalsList.filter((a) => a.status === 'pending').length;
  const totalEmails = apps.reduce((s, a) => s + a.emailsSent, 0);
  const successRate = logs.length > 0
    ? Math.round((logs.filter((l) => l.status === 'sent').length / logs.length) * 100)
    : 0;

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <Button variant="ghost" size="icon" onClick={() => router.push('/dm')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Command Center</h1>
            <p className="text-xs text-muted-foreground">Hermes · NexusMail · Approvals</p>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchAll} aria-label="Refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Apps',        value: apps.length, color: 'text-purple-400' },
            { label: 'Emails Sent', value: totalEmails,  color: 'text-blue-400' },
            { label: 'Success',     value: `${successRate}%`, color: 'text-green-400' },
            { label: 'Pending',     value: pending,      color: pending > 0 ? 'text-yellow-400' : 'text-muted-foreground' },
          ].map((s) => (
            <Card key={s.label} className="glass-panel border-white/10">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="approvals">
          <TabsList className="glass-panel border border-white/10 h-auto gap-1 p-1">
            <TabsTrigger value="approvals" className="gap-1.5 text-xs">
              <ShieldCheck className="w-3.5 h-3.5" /> Approvals
              {pending > 0 && (
                <span className="ml-0.5 bg-yellow-500 text-black text-[10px] font-bold rounded-full w-4 h-4 inline-flex items-center justify-center">
                  {pending}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="hermes" className="gap-1.5 text-xs">
              <Bot className="w-3.5 h-3.5" /> Hermes
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-1.5 text-xs">
              <Mail className="w-3.5 h-3.5" /> Email Apps
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5 text-xs">
              <Clock className="w-3.5 h-3.5" /> Audit Log
            </TabsTrigger>
          </TabsList>

          {/* ── Approvals ── */}
          <TabsContent value="approvals" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">Approval Requests</h2>
              <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-violet-500 hover:bg-violet-600 gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> New Request
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-panel border-purple-500/20">
                  <DialogHeader>
                    <DialogTitle className="text-white">New Approval Request</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-white text-sm">Title</Label>
                      <Input
                        placeholder="What needs approval?"
                        value={apTitle}
                        onChange={(e) => setApTitle(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-white text-sm">Description</Label>
                      <Textarea
                        placeholder="Add context…"
                        value={apDesc}
                        onChange={(e) => setApDesc(e.target.value)}
                        className="mt-1 resize-none"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label className="text-white text-sm">Priority</Label>
                      <Select value={apPriority} onValueChange={setApPriority}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>Cancel</Button>
                    <Button onClick={createApproval} className="bg-violet-500 hover:bg-violet-600">Submit</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {approvalsList.length === 0 ? (
              <Card className="glass-panel border-white/10">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No approval requests yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {approvalsList.map((ap) => (
                  <Card key={ap.id} className="glass-panel border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-white text-sm">{ap.title}</p>
                            <Badge className={`text-[10px] ${STATUS_COLORS[ap.status] || ''}`}>{ap.status}</Badge>
                            <Badge className={`text-[10px] ${STATUS_COLORS[ap.priority] || ''}`}>{ap.priority}</Badge>
                          </div>
                          {ap.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ap.description}</p>
                          )}
                          <p className="text-[11px] text-muted-foreground mt-1.5">
                            By {ap.requestedBy} · {formatDistanceToNow(new Date(ap.createdAt), { addSuffix: true })}
                            {ap.appSource && ` · via ${ap.appSource}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {ap.status === 'pending' && (
                            <>
                              <Button
                                size="sm" variant="ghost"
                                onClick={() => decideApproval(ap.id, 'approved')}
                                className="h-8 w-8 p-0 text-green-400 hover:bg-green-500/10"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm" variant="ghost"
                                onClick={() => decideApproval(ap.id, 'rejected')}
                                className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => deleteApproval(ap.id)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Hermes ── */}
          <TabsContent value="hermes" className="mt-4">
            <Card className="glass-panel border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Hermes Dispatch</CardTitle>
                <CardDescription>Send messages from any registered app via NexusMail</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white text-sm">API Key</Label>
                    <Input
                      type="password"
                      placeholder="App API key"
                      value={hermesKey}
                      onChange={(e) => setHermesKey(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-white text-sm">Recipient</Label>
                    <Input
                      type="email"
                      placeholder="recipient@example.com"
                      value={hermesRecipient}
                      onChange={(e) => setHermesRecipient(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-white text-sm">Subject</Label>
                  <Input
                    placeholder="Subject"
                    value={hermesSubject}
                    onChange={(e) => setHermesSubject(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-white text-sm">Body</Label>
                  <Textarea
                    placeholder="Message body (HTML supported)"
                    value={hermesBody}
                    onChange={(e) => setHermesBody(e.target.value)}
                    className="mt-1 resize-none"
                    rows={5}
                  />
                </div>
                <Button
                  onClick={sendHermes}
                  disabled={hermesSending || !hermesKey || !hermesRecipient || !hermesSubject || !hermesBody}
                  className="bg-purple-500 hover:bg-purple-600 gap-2"
                >
                  {hermesSending
                    ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-4 h-4" />
                    : <Bot className="w-4 h-4" />}
                  {hermesSending ? 'Sending…' : 'Dispatch via Hermes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Email Apps ── */}
          <TabsContent value="email" className="mt-4">
            <Card className="glass-panel border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Connected Apps</CardTitle>
                    <CardDescription>API keys for email dispatch</CardDescription>
                  </div>
                  <Dialog open={appDialogOpen} onOpenChange={setAppDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-purple-500 hover:bg-purple-600 gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> Register
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-panel border-purple-500/20">
                      <DialogHeader>
                        <DialogTitle className="text-white">Register New App</DialogTitle>
                      </DialogHeader>
                      <div>
                        <Label className="text-white">App Name</Label>
                        <Input
                          placeholder="My App"
                          value={newAppName}
                          onChange={(e) => setNewAppName(e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAppDialogOpen(false)}>Cancel</Button>
                        <Button onClick={registerApp} className="bg-purple-500 hover:bg-purple-600">Register</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {apps.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No apps registered yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-white">Name</TableHead>
                          <TableHead className="text-white">API Key</TableHead>
                          <TableHead className="text-white">Status</TableHead>
                          <TableHead className="text-white">Sent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {apps.map((app) => (
                          <TableRow key={app.id}>
                            <TableCell className="text-white font-medium">{app.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-black/20 px-2 py-1 rounded">
                                  {app.apiKey.substring(0, 18)}…
                                </code>
                                <Button variant="ghost" size="sm" onClick={() => copyKey(app.apiKey, app.id)}>
                                  {copiedKey === app.id
                                    ? <Check className="w-3.5 h-3.5 text-green-500" />
                                    : <Copy className="w-3.5 h-3.5" />}
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={STATUS_COLORS[app.status] || ''}>{app.status}</Badge>
                            </TableCell>
                            <TableCell className="text-white">{app.emailsSent}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Audit Log ── */}
          <TabsContent value="logs" className="mt-4">
            <Card className="glass-panel border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Audit Log</CardTitle>
                <CardDescription>Recent email delivery attempts</CardDescription>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No logs yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-white">Time</TableHead>
                          <TableHead className="text-white">Source</TableHead>
                          <TableHead className="text-white">Recipient</TableHead>
                          <TableHead className="text-white">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-muted-foreground text-xs">
                              {new Date(log.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-white text-sm">{log.appSource}</TableCell>
                            <TableCell className="text-white text-sm">{log.recipient}</TableCell>
                            <TableCell>
                              <Badge className={STATUS_COLORS[log.status] || ''}>{log.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
