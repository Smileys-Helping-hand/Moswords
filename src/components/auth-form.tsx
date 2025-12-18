"use client";

import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  User,
  deleteUser,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '@/lib/firebase';
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
import { FirebaseError } from 'firebase/app';

async function createUserDocument(user: User) {
  const userRef = doc(firestore, 'users', user.uid);
  // Use setDoc with merge:true to create or update the document
  // This is useful for Google Sign-In where the user might already exist
  await setDoc(userRef, {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    createdAt: new Date(),
  }, { merge: true });
}

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAuthError = (error: any) => {
    console.error('Authentication error:', error);
    let description = 'An unknown error occurred.';
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/invalid-email':
          description = 'Please enter a valid email address.';
          break;
        case 'auth/user-disabled':
          description = 'This user account has been disabled.';
          break;
        case 'auth/user-not-found':
          description = 'No user found with this email.';
          break;
        case 'auth/wrong-password':
          description = 'Incorrect password. Please try again.';
          break;
        case 'auth/email-already-in-use':
          description = 'An account already exists with this email address.';
          break;
        case 'auth/network-request-failed':
          description = 'Network error. Please check your internet connection.';
          break;
        case 'auth/popup-closed-by-user':
          description = 'Sign-in popup closed before completion.';
          break;
        case 'permission-denied':
           description = 'You do not have permission to perform this action.';
           break;
        default:
          description = error.message;
      }
    }
    toast({
      variant: 'destructive',
      title: 'Authentication Failed',
      description,
    });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        toast({
            variant: 'destructive',
            title: 'Password too short',
            description: 'Your password must be at least 6 characters long.',
        });
        return;
    }
    setLoading(true);
    let user: User | null = null;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      user = userCredential.user;
      await createUserDocument(user);
      toast({
        title: 'Success!',
        description: 'Your account has been created.',
      });
    } catch (error) {
        // If creating the user document fails, we should delete the auth user
        // to prevent having an auth user without a database entry.
        if (user) {
            await deleteUser(user).catch(deleteError => {
                console.error("Failed to delete orphaned auth user:", deleteError);
                // If this fails, we have an orphaned auth user.
                // We should probably log this to a monitoring service.
                 toast({
                    variant: 'destructive',
                    title: 'Critical Error',
                    description: "Could not create user profile and failed to cleanup. Please contact support.",
                });
            });
        }
        handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // Create user document on first sign in
      if (result.user.metadata.creationTime === result.user.metadata.lastSignInTime) {
        await createUserDocument(result.user);
      }
    } catch (error) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
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
                    <Input id="signin-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
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
                    <Input id="signup-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
                </div>
                </CardContent>
                <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creating Account...' : 'Sign Up'}</Button>
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
