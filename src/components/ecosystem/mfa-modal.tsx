'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Copy, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

interface MfaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

export default function MfaModal({ open, onOpenChange, userEmail }: MfaModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [manualEntryKey, setManualEntryKey] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const handleSetupMfa = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/mfa/setup');
      if (res.ok) {
        const data = await res.json();
        setSecret(data.secret);
        setQrCode(data.qrCode);
        setBackupCodes(data.backupCodes);
        setManualEntryKey(data.manualEntryKey);
        setStep('verify');
        toast.success('MFA setup initiated');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to setup MFA');
      }
    } catch (error) {
      console.error('Error setting up MFA:', error);
      toast.error('Error setting up MFA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!verifyToken) {
      toast.error('Please enter the token from your authenticator app');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/admin/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret,
          token: verifyToken,
          backupCodes,
          action: 'enable',
        }),
      });

      if (res.ok) {
        toast.success('MFA enabled successfully!');
        onOpenChange(false);
        // Reset state
        setStep('setup');
        setSecret('');
        setQrCode('');
        setBackupCodes([]);
        setVerifyToken('');
        setManualEntryKey('');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to verify MFA token');
      }
    } catch (error) {
      console.error('Error verifying MFA:', error);
      toast.error('Error verifying MFA');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🔐 Setup Two-Factor Authentication</DialogTitle>
          <DialogDescription>
            Secure your admin account with time-based one-time passwords
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {step === 'setup' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Step 1: Get Started</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">
                    You'll need an authenticator app like Google Authenticator, Microsoft
                    Authenticator, or Authy to enable MFA.
                  </p>
                  <Button onClick={handleSetupMfa} disabled={loading} className="w-full">
                    {loading ? 'Generating...' : 'Generate Setup Code'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {step === 'verify' && qrCode && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Step 2: Scan QR Code</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center">
                    <img src={qrCode} alt="MFA QR Code" className="w-48 h-48 border rounded-lg" />
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    Scan this QR code with your authenticator app
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Or Enter Manually</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-3 rounded font-mono text-sm break-all flex items-center justify-between gap-2">
                    <span>{manualEntryKey}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(manualEntryKey, 'Setup Key')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Step 3: Verify Token</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Enter 6-digit token from your app"
                    value={verifyToken}
                    onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                    disabled={loading}
                  />
                  <Button
                    onClick={handleVerifyMfa}
                    disabled={verifyToken.length !== 6 || loading}
                    className="w-full"
                  >
                    {loading ? 'Verifying...' : 'Verify & Enable MFA'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-amber-50 border-amber-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>⚠️</span>
                    Save Backup Codes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">
                    Save these backup codes in a safe place. You can use them if you lose access to
                    your authenticator app.
                  </p>
                  <div className="bg-white p-3 rounded border border-amber-200">
                    <div className="space-y-1 font-mono text-xs">
                      {backupCodes.map((code, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span>{code}</span>
                          {idx === 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const allCodes = backupCodes.join('\n');
                                copyToClipboard(allCodes, 'All backup codes');
                              }}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
