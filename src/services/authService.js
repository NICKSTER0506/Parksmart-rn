// src/services/authService.js
import { auth, db } from '../config/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged as firebaseOnAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Register a new user with Email/Password and create a Firestore profile doc.
 * Default role is always 'user'.
 */
export async function register(email, password, name) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const userData = {
      uid: cred.user.uid,
      name,
      email: email.trim().toLowerCase(),
      role: 'user',
      vehicleType: null,
      preferredFloor: 1,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), userData);
    return cred.user;
  } catch (error) {
    throw new Error(error.message);
  }
}

/**
 * Log in an existing user with Email/Password.
 */
export async function login(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return cred.user;
  } catch (error) {
    throw new Error(error.message);
  }
}

/**
 * Log out the current user session.
 */
export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error(error.message);
  }
}

/**
 * Get the currently logged-in Firebase Auth user.
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Update the user's profile data in Firestore.
 */
export async function updateUserProfile(uid, name, vehicleType) {
  try {
    const { updateDoc } = require('firebase/firestore');
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      name,
      vehicleType: vehicleType === 'none' ? null : vehicleType
    });
  } catch (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }
}

/**
 * Listen for Firebase Auth state changes.
 */
export function onAuthStateChanged(callback) {
  return firebaseOnAuthStateChanged(auth, callback);
}
