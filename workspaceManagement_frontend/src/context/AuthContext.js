import React, { createContext, useContext, useState, useEffect } from 'react';
import { isValidEmail, isValidPassword } from '../utils/validation';
import { loginUser, updateUserProfile } from '../services/api';
// Hardcoded Super Admin account (platform owner) — see superAdminConfig.js
import {
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_PASSWORD,
  SUPER_ADMIN_USER,
} from '../utils/superAdminConfig';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isSplashLoading, setIsSplashLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsSplashLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const login = async (email, password) => {
    if (!isValidEmail(email)) {
      return { success: false, error: 'Please enter a valid work email address' };
    }
    if (!isValidPassword(password)) {
      return { success: false, error: '! Password must be at least 6 characters' };
    }

    // Step 1: Check the hardcoded Super Admin account first
    if (email.toLowerCase().trim() === SUPER_ADMIN_EMAIL) {
      if (password !== SUPER_ADMIN_PASSWORD) {
        return { success: false, error: 'Incorrect password entered' };
      }
      setCurrentUser(SUPER_ADMIN_USER);
      return { success: true, user: SUPER_ADMIN_USER };
    }

    // Step 2: Authenticate user against the MySQL backend database
    try {
      const res = await loginUser(email.toLowerCase().trim(), password);
      setCurrentUser(res.user);
      return { success: true, user: res.user };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Unable to authenticate with database server',
      };
    }
  };

  // Single update function for the logged-in user: persists changes to the
  // MySQL users table and updates the active session state.
  const updateCurrentUser = async (fields) => {
    if (!currentUser) {
      return { success: false, error: 'No active session.' };
    }
    try {
      const res = await updateUserProfile({
        email: currentUser.email,
        ...fields,
      });
      const updated = { ...currentUser, ...res.user, ...fields };
      setCurrentUser(updated);
      return { success: true, user: updated };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to update profile in database.',
      };
    }
  };

  const logout = async () => {
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isSplashLoading,
        login,
        updateCurrentUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
