"use client";

import { useEffect, useState, useMemo } from 'react';
import { getProviders, signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ChromeIcon } from 'lucide-react';
import { MoswordsIcon } from './icons';
import { PasswordInput, validationRules } from './ui/password-input';

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Invite links send people here with ?callbackUrl=/add/<id>; only same-site paths are honoured.
  const rawCallback = searchParams.get('callbackUrl') || '/';
  const callbackUrl = rawCallback.startsWith('/') && !rawCallback.startsWith('//') ? rawCallback : '/';
  const initialTab = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';

  useEffect(() => {
    getProviders()
      .then((p) => setGoogleEnabled(!!p?.google))
      .catch(() => {});
  }, []);

  /** Credentials sign-in without a full-page redirect, so errors can be shown. */
  const signInWithPassword = async () => {
    const result = await signIn('credentials', { email, password, redirect: false });
    if (!result || result.error) {
      const message =
        result?.error && /^(Too many|This account has been suspended)/.test(result.error)
          ? result.error
          : 'Incorrect email or password.';
      throw new Error(message);
    }
    router.replace(callbackUrl);
    router.refresh();
  };

  // Check if all password validation rules pass
  const passwordValid = useMemo(() => {
    return validationRules.every((rule) => rule.test(password));
  }, [password]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValid) {
      toast({
        variant: 'destructive',
        title: 'Invalid password',
        description: 'Please meet all password requirements.',
      });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/auth/signup?_t=${Date.now()}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        cache: 'no-store',
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      toast({ title: 'Welcome to Moswords!', description: 'Your account is ready.' });
      await signInWithPassword();
      return;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign up failed',
        description: error.message || 'Failed to create account. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithPassword();
      return;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign in failed',
        description: error.message || 'Invalid email or password.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => signIn('google', { callbackUrl });

  return (
    <div className="flex flex-col items-center space-y-4">
      <MoswordsIcon className="w-16 h-16" />
      <h1 className="text-3xl font-bold">Welcome to Moswords</h1>
      <p className="text-muted-foreground">Sign in or create a free account to start chatting</p>
      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          <Card>
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>Enter your credentials to access your account.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSignIn}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input id="signin-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <PasswordInput
                    id="signin-password"
                    autoComplete="current-password"
                    required 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    disabled={loading}
                    showValidation={false}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-4">
                <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Signing In...' : 'Sign In'}</Button>
                <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">
                  Forgot your password?
                </Link>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>Sign Up</CardTitle>
              <CardDescription>Create a new account to get started.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSignUp}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Your name</Label>
                  <Input
                    id="signup-name"
                    autoComplete="name"
                    placeholder="How friends will find you"
                    maxLength={60}
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <PasswordInput
                    id="signup-password"
                    autoComplete="new-password"
                    required 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    disabled={loading}
                    showValidation={true}
                    placeholder="At least 8 characters"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !passwordValid || !email || !name.trim()}
                >
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        {googleEnabled && (
          <>
            <div className="relative mt-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={handleGoogleSignIn} disabled={loading}>
              <ChromeIcon className="mr-2 h-4 w-4" />
              Google
            </Button>
          </>
        )}
      </Tabs>
    </div>
  );
}