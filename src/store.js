import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tiny shared AsyncStorage state: every screen using the same key sees the same value.
const cache = {};
const subs = {};

export function useStored(key) {
  const [value, setValue] = useState(cache[key] ?? []);
  useEffect(() => {
    (subs[key] ??= new Set()).add(setValue);
    if (!(key in cache)) {
      AsyncStorage.getItem(key)
        .then((v) => { cache[key] = v ? JSON.parse(v) : []; subs[key].forEach((f) => f(cache[key])); })
        .catch(() => {});
    }
    return () => subs[key].delete(setValue);
  }, [key]);
  const save = useCallback((next) => {
    cache[key] = next;
    subs[key]?.forEach((f) => f(next));
    return AsyncStorage.setItem(key, JSON.stringify(next));
  }, [key]);
  return [value, save];
}
