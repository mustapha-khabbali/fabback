import { createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, addDoc, collection, serverTimestamp, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCTdUIf-eUUXuHVCJOK7R7DG9aToeF-96Y",
  authDomain: "fablab-bmk.firebaseapp.com",
  projectId: "fablab-bmk",
  storageBucket: "fablab-bmk.firebasestorage.app",
  messagingSenderId: "1094196382348",
  appId: "1:1094196382348:web:cb912662e010323d1f09a9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({ prompt: 'select_account' });

export const firebase = {
  app,
  auth,
  db,
  googleProvider,
  microsoftProvider,
  // Auth actions
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  // Firestore actions
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
};

const FirebaseContext = createContext(firebase);

export function FirebaseProvider({ children }) {
  return (
    <FirebaseContext.Provider value={firebase}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  return useContext(FirebaseContext);
}
