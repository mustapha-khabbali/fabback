import fs from 'node:fs';
import admin from 'firebase-admin';
import { config } from '../config.js';

let firebaseApp;

export function getFirebaseAuth() {
  if (!firebaseApp) {
    if (!config.firebaseServiceAccount) {
      const error = new Error('FIREBASE_SERVICE_ACCOUNT is required for Google auth');
      error.status = 500;
      throw error;
    }

    const serviceAccount = JSON.parse(fs.readFileSync(config.firebaseServiceAccount, 'utf8'));
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  return firebaseApp.auth();
}
