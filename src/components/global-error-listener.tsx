"use client";

import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { onAuthError, onPermissionError } from "@/lib/firebase-error-handler";

export default function GlobalErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthError((error) => {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: error.customData?.errorMessage || error.message,
      });
    });

    const unsubscribePermission = onPermissionError((error) => {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: error.customData?.errorMessage || "You don't have permission to do that.",
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribePermission();
    };
  }, [toast]);

  return null;
}
