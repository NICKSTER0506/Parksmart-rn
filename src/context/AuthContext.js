// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, logout as authLogout } from '../services/authService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let currentUnsubSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(async (firebaseUser) => {
      if (currentUnsubSnapshot) {
        currentUnsubSnapshot();
        currentUnsubSnapshot = null;
      }

      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setUserDoc(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        currentUnsubSnapshot = onSnapshot(userRef, (userSnap) => {
          if (userSnap.exists()) {
            const profile = userSnap.data();
            setUserDoc(profile);
            setRole(profile.role || 'user');
          } else {
            setUserDoc(null);
            setRole('user');
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user profile in AuthContext: ", error);
          setUserDoc(null);
          setRole('user');
          setLoading(false);
        });

      } catch (error) {
        console.error("Error setting up user snapshot in AuthContext: ", error);
        setUserDoc(null);
        setRole('user');
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (currentUnsubSnapshot) currentUnsubSnapshot();
    };
  }, []);

  const logout = async () => {
    await authLogout();
  };

  const value = {
    user,
    role,
    userDoc,
    loading,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
export default AuthContext;
