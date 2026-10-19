// Centralized AsyncStorage Service
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SEED_COMPANY,
  SEED_ATTENDANCE,
  SEED_SALARY_CONFIG,
  SEED_HR_TICKETS,
  SEED_LEAVES,
  SEED_TASKS,
  SEED_REQUIREMENTS,
} from '../data/seedData';

export const STORAGE_KEYS = {
  APP_INITIALIZED: '@wms_app_initialized',
  DEMO_USERS_CLEANED: '@wms_demo_users_cleaned',
  AUTH_CURRENT_USER: '@wms_auth_current_user',
  THEME_PREFERENCE: '@wms_theme_preference',
  COMPANY: '@wms_company',
  USERS: '@wms_users',
  ATTENDANCE: '@wms_attendance',
  SALARY_CONFIG: '@wms_salary_config',
  TICKETS: '@wms_tickets',
  LEAVES: '@wms_leaves',
  TASKS: '@wms_tasks',
  REQUIREMENTS: '@wms_requirements',
};

export const storageService = {
  async getItem(key, defaultValue = null) {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      if (jsonValue === null || jsonValue === undefined) {
        return defaultValue;
      }
      return JSON.parse(jsonValue);
    } catch (e) {
      console.warn(`[storageService] Error getting item for key ${key}:`, e);
      return defaultValue;
    }
  },

  async setItem(key, value) {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      return true;
    } catch (e) {
      console.warn(`[storageService] Error setting item for key ${key}:`, e);
      return false;
    }
  },

  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn(`[storageService] Error removing item for key ${key}:`, e);
      return false;
    }
  },

  async initializeSeedDataIfNeeded() {
    try {
      const isInit = await this.getItem(STORAGE_KEYS.APP_INITIALIZED, false);
      if (!isInit) {
        await this.resetToSeedData();
      }
      // ONE-TIME demo users cleanup (guarded by a flag so it can never delete
      // real users again). Devices that ran an older version of the app still
      // have the old demo users stored; every real user now carries a companyId,
      // so anything without one is a leftover demo/seed user. This runs at most
      // once — running it on every launch would wrongly delete real users that
      // were created by an Admin who had no companyId yet.
      const alreadyCleaned = await this.getItem(STORAGE_KEYS.DEMO_USERS_CLEANED, false);
      if (!alreadyCleaned) {
        const storedUsers = await this.getItem(STORAGE_KEYS.USERS, []);
        const realUsers = storedUsers.filter((u) => u.companyId);
        if (realUsers.length !== storedUsers.length) {
          await this.setItem(STORAGE_KEYS.USERS, realUsers);
        }
        await this.setItem(STORAGE_KEYS.DEMO_USERS_CLEANED, true);
      }
    } catch (e) {
      console.warn('[storageService] Initialization check failed:', e);
    }
  },

  async resetToSeedData() {
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.COMPANY, JSON.stringify(SEED_COMPANY)],
        [STORAGE_KEYS.USERS, JSON.stringify([])], // no demo users — accounts are created at runtime
        [STORAGE_KEYS.ATTENDANCE, JSON.stringify(SEED_ATTENDANCE)],
        [STORAGE_KEYS.SALARY_CONFIG, JSON.stringify(SEED_SALARY_CONFIG)],
        [STORAGE_KEYS.TICKETS, JSON.stringify(SEED_HR_TICKETS)],
        [STORAGE_KEYS.LEAVES, JSON.stringify(SEED_LEAVES)],
        [STORAGE_KEYS.TASKS, JSON.stringify(SEED_TASKS)],
        [STORAGE_KEYS.REQUIREMENTS, JSON.stringify(SEED_REQUIREMENTS)],
        [STORAGE_KEYS.APP_INITIALIZED, JSON.stringify(true)],
      ]);
      return true;
    } catch (e) {
      console.warn('[storageService] Failed resetting seed data:', e);
      return false;
    }
  },
};

export default storageService;
