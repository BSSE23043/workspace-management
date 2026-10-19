import storageService, { STORAGE_KEYS } from './storageService';
import { SEED_SALARY_CONFIG } from '../data/seedData';

// ---------------------------------------------------------------------------
// SALARY SERVICE — payroll policy is NO LONGER stored in Redux.
//
// AsyncStorage (@wms_salary_config) is the single source of truth. Every screen
// that needs the policy calls loadSalaryConfig() when it mounts (and again on
// focus), and each mutation below does the same three steps the old
// salarySlice reducers did, but against the stored config:
//
//   1. read the current config from AsyncStorage
//   2. apply the change (same logic the old slice had)
//   3. write the config back and return it
//
// So a screen only ever writes two lines:
//
//   const next = await updateCompanySalaryConfig({ ... });
//   setSalaryConfig(next);
//
// Saving policy / per-employee overrides therefore persists and survives app
// reloads (the old Redux copy was session-only).
// ---------------------------------------------------------------------------

// Read the config (never returns a partial object — missing keys fall back to
// the seed policy defaults so the shape is always { companyWide, overrides }).
export const loadSalaryConfig = async () => {
  const stored = await storageService.getItem(STORAGE_KEYS.SALARY_CONFIG, null);
  return {
    companyWide: { ...SEED_SALARY_CONFIG.companyWide, ...(stored?.companyWide || {}) },
    overrides: { ...(stored?.overrides || {}) },
  };
};

// Persist the whole config (used by the mutations below and by any bulk write).
export const saveSalaryConfig = async (config) => {
  await storageService.setItem(STORAGE_KEYS.SALARY_CONFIG, config);
  return config;
};

// HR updates the company-wide default policy (merge onto the current values).
export const updateCompanySalaryConfig = async (payload) => {
  const config = await loadSalaryConfig();
  config.companyWide = {
    ...config.companyWide,
    ...payload,
  };
  return saveSalaryConfig(config);
};

// HR sets/updates a single employee's override (falls back to the company-wide
// policy for any field the override does not specify — same as the old slice).
export const updateEmployeeSalaryOverride = async ({ userId, config: overrideConfig }) => {
  const config = await loadSalaryConfig();
  config.overrides[userId] = {
    ...(config.overrides[userId] || config.companyWide),
    ...overrideConfig,
  };
  return saveSalaryConfig(config);
};
