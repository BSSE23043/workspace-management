import React, { createContext, useContext, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updateCompanyProfile } from '../store/slices/companySlice';
import storageService, { STORAGE_KEYS } from '../services/storageService';
import { isValidEmail, isValidPassword } from '../utils/validation';
// Hardcoded Super Admin account (platform owner) — see superAdminConfig.js
import {
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_PASSWORD,
  SUPER_ADMIN_USER,
} from '../utils/superAdminConfig';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const [currentUser, setCurrentUser] = useState(null);
  const [isSplashLoading, setIsSplashLoading] = useState(true);

  // Initialize seed data and restore session
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        await storageService.initializeSeedDataIfNeeded();
        // Load the saved company profile into Redux — the company slice is
        // in-memory only, so without this the profile resets to the seed on
        // every reload. Same AsyncStorage-as-source-of-truth pattern as users.
        const storedCompany = await storageService.getItem(STORAGE_KEYS.COMPANY, null);
        if (isMounted && storedCompany) {
          dispatch(updateCompanyProfile(storedCompany));
        }
        const savedUser = await storageService.getItem(STORAGE_KEYS.AUTH_CURRENT_USER, null);
        if (isMounted) {
          // If no session exists, default to Admin or null
          setCurrentUser(savedUser);
        }
      } catch (err) {
        console.warn('[AuthContext] Session restore error:', err);
      } finally {
        if (isMounted) {
          // Brief splash timer to simulate network/system initialization
          setTimeout(() => setIsSplashLoading(false), 500);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email, password) => {
    if (!isValidEmail(email)) {
      return { success: false, error: 'Please enter a valid work email address' };
    }
    if (!isValidPassword(password)) {
      return { success: false, error: '! Password must be at least 6 characters' };
    }

    // ------------------------------------------------------------------
    // Step 1: Check the hardcoded Super Admin account first.
    // Logging in with the Super Admin email opens the Super Admin portal,
    // where Company Admin accounts can be added or removed.
    // ------------------------------------------------------------------
    if (email.toLowerCase().trim() === SUPER_ADMIN_EMAIL) {
      if (password !== SUPER_ADMIN_PASSWORD) {
        return { success: false, error: 'Incorrect password entered' };
      }
      setCurrentUser(SUPER_ADMIN_USER);
      await storageService.setItem(STORAGE_KEYS.AUTH_CURRENT_USER, SUPER_ADMIN_USER);
      return { success: true, user: SUPER_ADMIN_USER };
    }

    // ------------------------------------------------------------------
    // Step 2: Regular login flow — look up the user (Company Admins created
    // by the Super Admin, plus every user those admins have provisioned)
    // in AsyncStorage. There are no demo/seed users anymore.
    // ------------------------------------------------------------------
    const storedUsers = await storageService.getItem(STORAGE_KEYS.USERS, []);
    const user = storedUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase().trim()
    );

    if (!user) {
      return { success: false, error: 'No user found with this email address' };
    }

    if (user.password && user.password !== password) {
      return { success: false, error: 'Incorrect password entered' };
    }

    if (user.isActive === false) {
      return { success: false, error: 'Account has been deactivated. Contact Admin.' };
    }

    // Backfill a companyId for any Admin that predates company-scoping (e.g.
    // accounts created before the Super Admin flow started assigning one).
    // Without this, every employee the Admin creates would be saved with no
    // companyId and then removed by the one-time demo-user cleanup — making
    // new users "vanish" after a reload. We persist the backfilled id so all
    // future users this Admin provisions are correctly company-scoped.
    if (user.role === 'ADMIN' && !user.companyId) {
      const backfilledId = `CO-${Math.floor(100 + Math.random() * 900)}`;
      user.companyId = backfilledId;
      const updatedUsers = storedUsers.map((u) =>
        u.id === user.id ? { ...u, companyId: backfilledId } : u
      );
      await storageService.setItem(STORAGE_KEYS.USERS, updatedUsers);
    }

    setCurrentUser(user);
    await storageService.setItem(STORAGE_KEYS.AUTH_CURRENT_USER, user);
    return { success: true, user };
  };

  // NOTE: The old public "register" (self sign-up) function was removed.
  // Accounts are now created by the Super Admin from the Super Admin portal
  // (Company Admin accounts) and by Company Admins from the Admin portal
  // (HR / Manager / Employee / Client accounts).

  // Single update function for the logged-in user: merges any fields into the
  // session user and mirrors them to the stored users list, so both stay in
  // sync. Used by every profile screen (avatar, name, title, phone, ...).
  const updateCurrentUser = async (fields) => {
    if (!currentUser) {
      return { success: false, error: 'No active session.' };
    }
    const updated = { ...currentUser, ...fields };
    setCurrentUser(updated);
    await storageService.setItem(STORAGE_KEYS.AUTH_CURRENT_USER, updated);

    // Also mirror the same fields onto this user in the stored users list
    const storedUsers = await storageService.getItem(STORAGE_KEYS.USERS, []);
    const updatedUsers = storedUsers.map((u) =>
      u.id === currentUser.id ? { ...u, ...fields } : u
    );
    await storageService.setItem(STORAGE_KEYS.USERS, updatedUsers);
    return { success: true, user: updated };
  };

  const logout = async () => {
    setCurrentUser(null);
    await storageService.removeItem(STORAGE_KEYS.AUTH_CURRENT_USER);
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
