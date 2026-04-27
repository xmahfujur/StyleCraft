import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInAnonymously } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from './firebase';
import { ADMIN_EMAILS } from './constants';

// Test connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error.message?.includes('the client is offline')) {
      console.error("Firestore is offline. Please check your Firebase configuration.");
    }
    // Other errors are expected if the document doesn't exist, which is fine for a connection test.
  }
}
testConnection();

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
  isAnonymous: boolean;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true, 
  isAdmin: false,
  isAnonymous: false
});

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isSigningIn = false;
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u && !isSigningIn) {
        isSigningIn = true;
        try {
          await signInAnonymously(auth);
        } catch (error: any) {
          if (error.code === 'auth/admin-restricted-operation') {
            console.warn("Anonymous authentication is not enabled in Firebase Console. Please enable it under Authentication > Sign-in method.");
          } else {
            console.error("Anonymous auth error:", error);
          }
          setLoading(false);
        } finally {
          isSigningIn = false;
        }
      } else {
        setUser(u);
        // If anonymous, ensure a profile exists
        if (u?.isAnonymous) {
          const path = `users/${u.uid}`;
          try {
            const userDoc = await getDoc(doc(db, 'users', u.uid));
            if (!userDoc.exists()) {
              const data = {
                uid: u.uid,
                name: 'Guest User',
                email: null,
                role: 'guest',
                createdAt: new Date().toISOString()
              };
              await setDoc(doc(db, 'users', u.uid), data);
            }
          } catch (err: any) {
            handleFirestoreError(err, OperationType.WRITE, path);
          }
        }
        if (!u) setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user?.uid) {
      const path = `users/${user.uid}`;
      const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (doc) => {
        if (doc.exists()) {
          setProfile(doc.data());
        } else {
          setProfile(null);
        }
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, path);
        setLoading(false);
      });
      return unsubProfile;
    } else {
      setProfile(null);
      if (!user) setLoading(false);
    }
  }, [user]);

  const isAdmin = profile?.role === 'admin' || ADMIN_EMAILS.includes(user?.email || '');
  const isAnonymous = user?.isAnonymous || false;

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, isAnonymous }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
