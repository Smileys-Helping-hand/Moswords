// NOTE: This app now uses PostgreSQL/Neon with NextAuth instead of Firebase
// This file is kept for backward compatibility with existing components
// that haven't been migrated yet. Firebase functionality is disabled.

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Mock Firebase config - these values are not used
const firebaseConfig = {
  apiKey: 'mock-api-key',
  authDomain: 'mock-project.firebaseapp.com',
  projectId: 'mock-project',
  storageBucket: 'mock-project.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef',
  measurementId: 'G-XXXXXXXXXX',
  databaseURL: 'https://mock-project.firebaseio.com',
};

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let database: Database;
let storage: FirebaseStorage;

// Only initialize Firebase if credentials are provided (for migration purposes)
// Otherwise, create mock instances
if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'mock-api-key') {
  const realConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  };
  app = !getApps().length ? initializeApp(realConfig) : getApp();
  auth = getAuth(app);
  firestore = getFirestore(app);
  database = getDatabase(app);
  storage = getStorage(app);
} else {
  // Create mock Firebase instances for backward compatibility
  console.warn('Firebase is disabled. App is using PostgreSQL/Neon with NextAuth.');
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  firestore = getFirestore(app);
  database = getDatabase(app);
  storage = getStorage(app);
}

export { app, auth, firestore, database, storage };
