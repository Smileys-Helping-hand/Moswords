'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Copy, Eye, EyeOff, RefreshCw, Download, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import MfaModal from './mfa-modal';
import IntegrationGuideModal from './integration-guide-modal';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  features: string[];
  mfaEnabled: boolean;
  lastLogin?: string;
}

interface AuditLog {
  id: string;
  email: string;
  action: string;
  resource: string;
  createdAt: string;
  mfaVerified: boolean;
}

interface SettingsTabProps {
  isSuperAdmin: boolean;
  userEmail: string;
}

export default function SettingsTab({ isSuperAdmin, userEmail }: SettingsTabProps) {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('subdomain');
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [showIntegrationGuide, setShowIntegrationGuide] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');

  const API_SUBDOMAIN = 'api.awechat.co.za';

  // Fetch admin users (superadmin only)
  const fetchAdminUsers = async () => {
    if (!isSuperAdmin) return;

    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data.adminUsers || []);
      } else {
        toast.error('Failed to load admin users');
      }
    } catch (error) {
      console.error('Error fetching admin users:', error);
      toast.error('Error fetching admin users');
    } finally {
      setLoading(false);
    }
  };

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/auditlogs?limit=20');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  useEffect(() => {
    if (activeSection === 'users') {
      fetchAdminUsers();
    } else if (activeSection === 'logs') {
      fetchAuditLogs();
    }
  }, [activeSection]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const revokeAdminAccess = async (email: string) => {
    if (!window.confirm(`Are you sure you want to revoke admin access for ${email}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success(`Admin access revoked for ${email}`);
        fetchAdminUsers();
      } else {
        toast.error('Failed to revoke admin access');
      }
    } catch (error) {
      console.error('Error revoking admin access:', error);
      toast.error('Error revoking admin access');
    }
  };

  const addNewAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newAdminEmail }),
      });

      if (res.ok) {
        toast.success(`${newAdminEmail} added as admin`);
        setNewAdminEmail('');
        fetchAdminUsers();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to add admin');
      }
    } catch (error) {
      console.error('Error adding admin:', error);
      toast.error('Error adding admin');
    } finally {
      setLoading(false);
    }
  };

  const exportAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/auditlogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export' }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Audit logs exported');
      }
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      toast.error('Failed to export audit logs');
    }
  };

  return (
    <div className="space-y-8">
      {/* Section Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'subdomain', label: '🌐 Subdomain & API', icon: '🌐' },
          { id: 'mfa', label: '🔐 MFA Setup', icon: '🔐' },
          ...(isSuperAdmin ? [{ id: 'users', label: '👥 Admin Users', icon: '👥' }] : []),
          { id: 'logs', label: '📋 Audit Logs', icon: '📋' },
        ].map((section) => (
          <Button
            key={section.id}
            variant={activeSection === section.id ? 'default' : 'outline'}
            onClick={() => setActiveSection(section.id)}
            className="whitespace-nowrap"
          >
            {section.label}
          </Button>
        ))}
      </div>

      <div className="space-y-6">
        {/* SUBDOMAIN & API SECTION */}
        {activeSection === 'subdomain' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle>🌐 Your API Subdomain</CardTitle>
                <CardDescription>
                  This is where other apps connect to access your Second Brain ecosystem
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">API Endpoint</label>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-muted px-4 py-2 rounded-lg font-mono text-sm break-all">
                      https://{API_SUBDOMAIN}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(`https://${API_SUBDOMAIN}`, 'API URL')}
                      className="gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Master Token</label>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-muted px-4 py-2 rounded-lg font-mono text-sm break-all">
                      a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard('a7f2e9c4d1b8f3a6e5c2d9f1a4b7e0c3', 'Master Token')
                      }
                      className="gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>📖 Integration Guide</CardTitle>
                <CardDescription>
                  Step-by-step instructions for connecting apps to your ecosystem
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setShowIntegrationGuide(true)}
                  className="w-full gap-2"
                >
                  View Full Integration Guide
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🧪 Quick Test</CardTitle>
                <CardDescription>Test your API connectivity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-muted p-3 rounded font-mono text-xs space-y-2">
                  <p className="text-muted-foreground"># Health check (no auth required)</p>
                  <p className="text-green-600">
                    curl https://{API_SUBDOMAIN}/api/second-brain/health
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(
                        `curl https://${API_SUBDOMAIN}/api/second-brain/health`,
                        'Command'
                      )
                    }
                    className="w-full mt-2"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* MFA SECTION */}
        {activeSection === 'mfa' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <MfaModal open={showMfaModal} onOpenChange={setShowMfaModal} userEmail={userEmail} />
            <Card>
              <CardHeader>
                <CardTitle>🔐 Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Secure your admin account with time-based one-time passwords (TOTP)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setShowMfaModal(true)}
                  className="w-full gap-2"
                >
                  Enable MFA
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ADMIN USERS SECTION (SUPERADMIN ONLY) */}
        {isSuperAdmin && activeSection === 'users' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>👥 Add New Admin</CardTitle>
                <CardDescription>Grant admin access to another user</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="user@example.com"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addNewAdmin()}
                  />
                  <Button onClick={addNewAdmin} disabled={loading} className="gap-2">
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : '➕'}
                    Add Admin
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Admin Users ({adminUsers.length})</CardTitle>
                <CardDescription>Manage admin accounts and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {adminUsers.map((admin) => (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{admin.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {admin.role === 'superadmin' ? '👑 Superadmin' : '🔑 Admin'} •{' '}
                          {admin.mfaEnabled ? '🔐 MFA Enabled' : '⚠️ MFA Disabled'}
                        </p>
                      </div>
                      {admin.role !== 'superadmin' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => revokeAdminAccess(admin.email)}
                          className="gap-2"
                        >
                          <X className="w-4 h-4" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* AUDIT LOGS SECTION */}
        {activeSection === 'logs' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>📋 Recent Admin Actions</CardTitle>
                  <CardDescription>
                    Audit trail of all administrative actions
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportAuditLogs}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {auditLogs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No audit logs yet</p>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-2 border-b pb-3">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{log.action}</p>
                          <p className="text-xs text-muted-foreground">
                            {log.email} • {log.resource}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {log.mfaVerified && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            MFA
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Integration Guide Modal */}
      <IntegrationGuideModal open={showIntegrationGuide} onOpenChange={setShowIntegrationGuide} />
    </div>
  );
}
