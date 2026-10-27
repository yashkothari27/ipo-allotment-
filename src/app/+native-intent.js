import { getShareExtensionKey } from 'expo-share-intent';

// Shared text (a PAN) opens the PANs tab, which reads it via useShareIntentContext.
export function redirectSystemPath({ path }) {
  try {
    return path.includes(`dataUrl=${getShareExtensionKey()}`) ? '/pans' : path;
  } catch {
    return '/';
  }
}
