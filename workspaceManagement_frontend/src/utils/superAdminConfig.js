// ============================================================================
// Super Admin Configuration (Hardcoded Platform Owner Account)
// ----------------------------------------------------------------------------
// The Super Admin is NOT stored in AsyncStorage / seed data.
// These credentials are hardcoded in the app (this is a college project, so
// plaintext is acceptable here). Logging in with this email + password opens
// the Super Admin portal, which lets us add / remove Company Admin accounts.
// ============================================================================

// Hardcoded Super Admin login credentials
export const SUPER_ADMIN_EMAIL = 'superadmin@wms.com';
export const SUPER_ADMIN_PASSWORD = 'SuperAdmin@123';

// The Super Admin "user object" that gets stored in the session (AuthContext).
// It follows the same shape as the other users in seedData.js so the rest of
// the app (HeaderBar, ThemeContext, etc.) works with it without any changes.
export const SUPER_ADMIN_USER = {
  id: 'SUP-001',
  name: 'WMS Platform Owner',
  email: SUPER_ADMIN_EMAIL,
  password: SUPER_ADMIN_PASSWORD,
  role: 'SUPER_ADMIN',
  title: 'Super Admin (Platform Owner)',
  location: 'WMS Head Office',
  phone: '+92 300 0000001',
  department: 'Platform Management',
  avatarKey: 'appLogo',
  isActive: true,
  reportsTo: null,
};

// Helper: checks if a given email belongs to the hardcoded Super Admin
export const isSuperAdminEmail = (email) => {
  if (!email) {
    return false;
  }
  return email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase();
};

export default SUPER_ADMIN_USER;
