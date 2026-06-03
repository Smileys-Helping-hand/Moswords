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
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Copy, Mail, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';

interface MfaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

type MfaMethod = 'totp' | 'email';
type StepType = 'method-select' | 'totp-verify' | 'email-setup';

export default function MfaModal({ open, onOpenChange, userEmail }: MfaModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<StepType>('method-select');
  const [method, setMethod] = useState<MfaMethod | null>(null);

  // TOTP state
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [manualEntryKey, setManualEntryKey] = useState('');
  const [totpToken, setTotpToken] = useState('');

  // Email state
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleSetupTotp = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/mfa/setup');
      if (res.ok) {
        const data = await res.json();
        setSecret(data.secret);
        setQrCode(data.qrCode);
        setBackupCodes(data.backupCodes);
        setManualEntryKey(data.manualEntryKey);
        setMethod('totp');
        setStep('totp-verify');
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

  const handleVerifyTotp = async () => {
    if (!totpToken) {
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
          token: totpToken,
          backupCodes,
          action: 'enable',
        }),
      });

      if (res.ok) {
        toast.success('MFA enabled successfully!');
        onOpenChange(false);
        resetState();
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

  const handleSendEmailCode = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/mfa/email/send', {
        method: 'POST',
      });

      if (res.ok) {
        setEmailCodeSent(true);
        toast.success('Verification code sent to your email');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Error sending email code:', error);
      toast.error('Error sending verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    if (!emailCode) {
      toast.error('Please enter the code from your email');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/admin/mfa/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: emailCode,
          action: 'enable',
        }),
      });

      if (res.ok) {
        toast.success('Email MFA enabled successfully!');
        onOpenChange(false);
        resetState();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to verify code');
      }
    } catch (error) {
      console.error('Error verifying email code:', error);
      toast.error('Error verifying code');
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setStep('method-select');
    setMethod(null);
    setSecret('');
    setQrCode('');
    setBackupCodes([]);
    setManualEntryKey('');
    setTotpToken('');
    setEmailCode('');
    setEmailCodeSent(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const maskEmail = (email: string) => {
    const [local, domain] = email.split('@');
    return `${local.substring(0, 2)}***@${domain}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🔐 Setup Two-Factor Authentication</DialogTitle>
          <DialogDescription>
            Secure your admin account with an additional verification method
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Method Selection */}
          {step === 'method-select' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose your preferred verification method:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => {
                    setMethod('totp');
                    handleSetupTotp();
                  }}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-blue-600" />
                      Authenticator App
                    </CardTitle>
                    <CardDescription>Recommended</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      Use Google Authenticator, Microsoft Authenticator, or Authy to generate
                      verification codes.
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => {
                    setMethod('email');
                    setStep('email-setup');
                  }}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-green-600" />
                      Email Code
                    </CardTitle>
                    <CardDescription>Backup option</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      Receive a verification code via email when you need to authenticate.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TOTP Verification */}
          {step === 'totp-verify' && qrCode && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Step 1: Scan QR Code</CardTitle>
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
                  <CardTitle className="text-lg">Step 2: Verify Token</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Enter 6-digit token from your app"
                    value={totpToken}
                    onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                    disabled={loading}
                  />
                  <Button
                    onClick={handleVerifyTotp}
                    disabled={totpToken.length !== 6 || loading}
                    className="w-full"
                  >
                    {loading ? 'Verifying...' : 'Verify & Enable MFA'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep('method-select');
                      resetState();
                    }}
                    className="w-full"
                  >
                    Back
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

          {/* Email MFA Setup */}
          {step === 'email-setup' && !emailCodeSent && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Email Verification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    We'll send a 6-digit verification code to your email address:
                  </p>
                  <div className="bg-muted p-3 rounded">
                    <p className="font-mono text-sm">{maskEmail(userEmail)}</p>
                  </div>
                  <Button
                    onClick={handleSendEmailCode}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? 'Sending...' : 'Send Verification Code'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep('method-select');
                      resetState();
                    }}
                    className="w-full"
                  >
                    Back
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Email Code Entry */}
          {step === 'email-setup' && emailCodeSent && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Enter Verification Code</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Enter the 6-digit code sent to your email:
                  </p>
                  <Input
                    placeholder="000000"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                    disabled={loading}
                  />
                  <Button
                    onClick={handleVerifyEmailCode}
                    disabled={emailCode.length !== 6 || loading}
                    className="w-full"
                  >
                    {loading ? 'Verifying...' : 'Verify & Enable MFA'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSendEmailCode}
                    disabled={loading}
                    className="w-full"
                  >
                    Resend Code
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setStep('method-select');
                      resetState();
                    }}
                    className="w-full"
                  >
                    Back to Method Selection
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
