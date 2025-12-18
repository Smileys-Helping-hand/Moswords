import { EventEmitter } from "events";
import { AuthError, FirestoreError } from "firebase/app";

const errorEmitter = new EventEmitter();

export function emitAuthError(error: AuthError) {
  errorEmitter.emit("authError", error);
}

export function onAuthError(callback: (error: AuthError) => void) {
  errorEmitter.on("authError", callback);
  return () => errorEmitter.off("authError", callback);
}

export function emitPermissionError(error: FirestoreError) {
  errorEmitter.emit("permissionError", error);
}

export function onPermissionError(callback: (error: FirestoreError) => void) {
  errorEmitter.on("permissionError", callback);
  return () => errorEmitter.off("permissionError", callback);
}
