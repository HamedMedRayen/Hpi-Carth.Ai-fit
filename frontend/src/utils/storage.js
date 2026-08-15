import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const isNative = Capacitor.isNativePlatform();

// In-memory cache for synchronous reads of performance-critical values (like token and user object)
const cache = {
  aura_token: null,
  aura_user: null
};

// Function to hydrate cache at startup
export async function hydrateCache() {
  // Synchronous initial fallback from localStorage
  try {
    cache.aura_token = localStorage.getItem('aura_token');
    cache.aura_user = localStorage.getItem('aura_user');
  } catch (e) {
    console.error('localStorage read error:', e);
  }

  if (isNative) {
    try {
      const tokenResult = await Preferences.get({ key: 'aura_token' });
      if (tokenResult?.value) {
        cache.aura_token = tokenResult.value;
        try { localStorage.setItem('aura_token', tokenResult.value); } catch (e) {}
      }

      const userResult = await Preferences.get({ key: 'aura_user' });
      if (userResult?.value) {
        cache.aura_user = userResult.value;
        try { localStorage.setItem('aura_user', userResult.value); } catch (e) {}
      }
      console.log('Capacitor storage cache hydrated successfully');
    } catch (e) {
      console.error('Failed to hydrate Capacitor storage cache', e);
    }
  }
}

// Low-level asynchronous storage operations
export async function getItem(key) {
  if (key === 'aura_token' || key === 'aura_user') {
    return cache[key] || localStorage.getItem(key);
  }
  if (isNative) {
    const { value } = await Preferences.get({ key });
    return value;
  } else {
    return localStorage.getItem(key);
  }
}

export async function setItem(key, value) {
  if (key === 'aura_token' || key === 'aura_user') {
    cache[key] = value;
  }
  try {
    localStorage.setItem(key, value);
  } catch (e) {}

  if (isNative) {
    await Preferences.set({ key, value });
  }
}

export async function removeItem(key) {
  if (key === 'aura_token' || key === 'aura_user') {
    cache[key] = null;
  }
  try {
    localStorage.removeItem(key);
  } catch (e) {}

  if (isNative) {
    await Preferences.remove({ key });
  }
}

// Synchronous getters from the in-memory cache or localStorage fallback
export function getSyncItem(key) {
  if (key === 'aura_token' || key === 'aura_user') {
    if (cache[key]) return cache[key];
    try {
      const lsVal = localStorage.getItem(key);
      if (lsVal) {
        cache[key] = lsVal;
        return lsVal;
      }
    } catch (e) {}
    return cache[key];
  }
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}
