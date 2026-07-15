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
  if (isNative) {
    try {
      const tokenResult = await Preferences.get({ key: 'aura_token' });
      cache.aura_token = tokenResult.value;
      
      const userResult = await Preferences.get({ key: 'aura_user' });
      cache.aura_user = userResult.value;
      console.log('Capacitor storage cache hydrated successfully');
    } catch (e) {
      console.error('Failed to hydrate Capacitor storage cache', e);
    }
  } else {
    cache.aura_token = localStorage.getItem('aura_token');
    cache.aura_user = localStorage.getItem('aura_user');
  }
}

// Low-level asynchronous storage operations
export async function getItem(key) {
  if (key === 'aura_token' || key === 'aura_user') {
    return cache[key];
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
  if (isNative) {
    await Preferences.set({ key, value });
  } else {
    localStorage.setItem(key, value);
  }
}

export async function removeItem(key) {
  if (key === 'aura_token' || key === 'aura_user') {
    cache[key] = null;
  }
  if (isNative) {
    await Preferences.remove({ key });
  } else {
    localStorage.removeItem(key);
  }
}

// Synchronous getters from the in-memory cache or localStorage fallback
export function getSyncItem(key) {
  if (key === 'aura_token' || key === 'aura_user') {
    return cache[key];
  }
  if (!isNative) {
    return localStorage.getItem(key);
  }
  console.warn(`Attempted to synchronously read key "${key}" which is not cached in native environment`);
  return null;
}
