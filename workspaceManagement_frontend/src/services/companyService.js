import storageService, { STORAGE_KEYS } from './storageService';
import { SEED_COMPANY } from '../data/seedData';

// ---------------------------------------------------------------------------
// COMPANY SERVICE — the company profile is NO LONGER stored in Redux.
//
// AsyncStorage (@wms_company) is the single source of truth (it already was
// for the rest of the app, e.g. the client ProfileSettingsScreen reads it
// directly). Screens load it on demand and save through saveCompanyProfile(),
// which follows the same read → merge → write → return pattern as the other
// services (see salaryService.js / leaveService.js).
// ---------------------------------------------------------------------------

// Read the saved profile, overlaid on the seed defaults so the shape is always
// complete (a brand-new install still gets the functional geofence/payroll
// defaults before the admin saves anything).
export const loadCompanyProfile = async () => {
  const stored = await storageService.getItem(STORAGE_KEYS.COMPANY, null);
  return {
    ...SEED_COMPANY,
    ...(stored || {}),
  };
};

// Merge the given fields onto the saved profile, persist and return the result.
export const saveCompanyProfile = async (payload) => {
  const current = await loadCompanyProfile();
  const updated = {
    ...current,
    ...payload,
  };
  await storageService.setItem(STORAGE_KEYS.COMPANY, updated);
  return updated;
};
