import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Sensitive keys go to the Android Keystore / iOS Keychain; the rest stay in AsyncStorage.
const SECURE = new Set(['pans', 'applock']);

const insecure = new Set(); // secure keys whose Keystore access failed on this device

async function read(key) {
  if (!SECURE.has(key)) return AsyncStorage.getItem(key);
  const old = await AsyncStorage.getItem(key);
  try {
    const v = await SecureStore.getItemAsync(key);
    if (v != null) return v;
    // One-time move of data saved in plain AsyncStorage by older builds; the old copy is removed only after the secure write succeeds.
    if (old != null) {
      await SecureStore.setItemAsync(key, old);
      await AsyncStorage.removeItem(key);
    }
    return old;
  } catch (e) {
    // Never lose PANs because the Keystore misbehaves: keep using the plain copy.
    console.warn(`SecureStore ${key} failed, using AsyncStorage:`, e?.message || e);
    insecure.add(key);
    return old;
  }
}
const write = (key, v) => (SECURE.has(key) && !insecure.has(key) ? SecureStore.setItemAsync(key, v) : AsyncStorage.setItem(key, v));

// Tiny shared persisted state: every screen using the same key sees the same value.
const cache = {};
const subs = {};
const pending = {};

export function useStored(key, initial = []) {
  const [value, setValue] = useState(cache[key] ?? initial);
  const [ready, setReady] = useState(key in cache);
  useEffect(() => {
    const f = (v) => { setValue(v); setReady(true); };
    (subs[key] ??= new Set()).add(f);
    if (!(key in cache)) {
      // One shared read per key, so two screens mounting together can't race the migration.
      (pending[key] ??= read(key)
        .then((v) => { cache[key] = v ? JSON.parse(v) : initial; })
        .catch((e) => { console.warn(`read ${key} failed:`, e?.message || e); cache[key] = initial; }))
        .finally(() => subs[key].forEach((g) => g(cache[key])));
    }
    return () => subs[key].delete(f);
  }, [key]);
  const save = useCallback((next) => {
    cache[key] = next;
    subs[key]?.forEach((f) => f(next));
    return write(key, JSON.stringify(next));
  }, [key]);
  return [value, save, ready];
}

// FRUPM2791E -> FRU••••91E
export const maskPan = (p = '') => (p.length === 10 ? `${p.slice(0, 3)}••••${p.slice(7)}` : p);
// Older builds saved the PAN itself as the name; never show that unmasked.
export const panName = (x) => (x.label && x.label !== x.pan ? x.label : maskPan(x.pan));

// Read a stored value outside React (background tasks). Same storage rules as useStored.
export async function readStored(key, initial = []) {
  try {
    const v = await read(key);
    return v ? JSON.parse(v) : initial;
  } catch {
    return initial;
  }
}
export const writeStored = (key, value) => write(key, JSON.stringify(value));
