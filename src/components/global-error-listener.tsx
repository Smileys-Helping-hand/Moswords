"use client";

import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { onAuthError, onPermissionError } from "@/lib/firebase-error-handler";
import type { AuthError } from "firebase/auth";
import type { FirestorePermissionError } from "@/lib/errors";

export default function GlobalErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthError = (error: AuthError) => {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: (error as any).customData?.errorMessage || error.message,
      });
    };
    
    const handlePermissionError = (error: FirestorePermissionError) => {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: error.customData.errorMessage || "You don't have permission to do that.",
        duration: 20000,
      });
    };

    const unsubscribeAuth = onAuthError(handleAuthError);
    const unsubscribePermission = onPermissionError(handlePermissionError);

    return () => {
      unsubscribeAuth();
      unsubscribePermission();
    };
  }, [toast]);

  return null;
}

    