import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const isDemoMode = import.meta.env.MODE === 'test';
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

const fallbackConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'healthi-demo.firebaseapp.com',
  projectId: 'healthi-demo',
  appId: '1:123:web:demo'
};

const app = initializeApp(isFirebaseConfigured ? firebaseConfig : fallbackConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
