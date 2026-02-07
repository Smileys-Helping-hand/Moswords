"use client";

import { useState, useMemo } from 'react';
import { signIn } from 'next-auth/react';
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
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      toast({
        title: 'Success!',
        description: 'Your account has been created. Please sign in.',
      });

      // Auto sign in after successful signup
      await signIn('credentials', {
        email,
        password,
        redirect: true,
        callbackUrl: '/',
      });
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
      await signIn('credentials', {
        email,
        password,
        redirect: true,
        callbackUrl: '/',
      });
      return;
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        variant: 'destructive',
        title: 'Sign in failed',
        description: error.message || 'Invalid email or password.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    toast({
      variant: 'destructive',
      title: 'Google Sign-In Not Configured',
      description: 'Please use email and password to sign in. Google Sign-In is not yet set up.',
    });
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <MoswordsIcon className="w-16 h-16" />
      <h1 className="text-3xl font-bold">Welcome to Moswords</h1>
      <p className="text-muted-foreground">Sign in or create an account to continue</p>
      <Tabs defaultValue="signin" className="w-full">
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
                  <Input id="signin-email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <PasswordInput 
                    id="signin-password" 
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
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <PasswordInput 
                    id="signup-password" 
                    required 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    disabled={loading}
                    showValidation={true}
                    placeholder="Create a strong password"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !passwordValid || !email}
                >
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        <div className="relative mt-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <Button variant="outline" className="w-full mt-4" onClick={handleGoogleSignIn} disabled={loading}>
          <ChromeIcon className="mr-2 h-4 w-4" />
          Google
        </Button>
      </Tabs>
    </div>
  );
}