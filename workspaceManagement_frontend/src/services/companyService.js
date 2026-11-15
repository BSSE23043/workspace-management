import { SEED_COMPANY } from '../data/seedData';
import { fetchCompanyProfileApi, saveCompanyProfileApi } from './api';

// ---------------------------------------------------------------------------
// COMPANY SERVICE — backed by the MySQL `companies` and `salary_configs` tables
// via /api/admin/company/:companyId.
// ---------------------------------------------------------------------------

export const loadCompanyProfile = async (companyId) => {
  if (!companyId) {
    return { ...SEED_COMPANY };
  }
  try {
    const company = await fetchCompanyProfileApi(companyId);
    return {
      ...SEED_COMPANY,
      ...(company || {}),
    };
  } catch (err) {
    console.warn('[companyService.loadCompanyProfile] Error:', err);
    return { ...SEED_COMPANY };
  }
};

export const saveCompanyProfile = async (companyId, payload) => {
  if (!companyId) {
    return { ...SEED_COMPANY, ...payload };
  }
  const updated = await saveCompanyProfileApi(companyId, payload);
  return {
    ...SEED_COMPANY,
    ...(updated || {}),
  };
};
