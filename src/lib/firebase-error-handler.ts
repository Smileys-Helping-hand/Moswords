"use client";

import { EventEmitter } from "events";
import type { AuthError } from "firebase/auth";
import type { FirestorePermissionError } from "./errors";

const errorEmitter = new EventEmitter();

export function emitAuthError(error: AuthError) {
  errorEmitter.emit("authError", error);
}

export function onAuthError(callback: (error: AuthError) => void) {
  errorEmitter.on("authError", callback);
  return () => errorEmitter.off("authError", callback);
}

export function emitPermissionError(error: FirestorePermissionError) {
  errorEmitter.emit("permissionError", error);
}

export function onPermissionError(callback: (error: FirestorePermissionError) => void) {
  errorEmitter.on("permissionError", callback);
  return () => errorEmitter.off("permissionError", callback);
}

    