'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PasswordInput, validationRules } from '@/components/ui/password-input';

function ResetForm() {
  const token = useSearchParams().get('token') || '';
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = validationRules.every((rule) => rule.test(password));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not reset your password.');
      // Signed straight in with the new password.
      const result = data.email
        ? await signIn('credentials', { email: data.email, password, redirect: false })
        : null;
      router.replace(result && !result.error ? '/dm' : '/login');
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <CardContent className="space-y-4">
        <p className="text-sm">This reset link is incomplete. Request a new one.</p>
        <Button asChild className="w-full"><Link href="/forgot-password">Request a new link</Link></Button>
      </CardContent>
    );
  }

  return (
    <form onSubmit={submit}>
      <CardContent className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
          showValidation
          placeholder="At least 8 characters"
        />
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}{' '}
            {error.includes('expired') && <Link href="/forgot-password" className="underline">Request a new link</Link>}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button type="submit" className="w-full" disabled={busy || !valid}>
          {busy ? 'Saving…' : 'Save new password'}
        </Button>
      </CardFooter>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>You&apos;ll be signed in right after.</CardDescription>
        </CardHeader>
        <Suspense fallback={null}>
          <ResetForm />
        </Suspense>
      </Card>
    </main>
  );
}
