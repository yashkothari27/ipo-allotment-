import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import Feather from '@expo/vector-icons/Feather';
import { useStored } from './store';
import { C, F, ON_ACCENT } from './theme';

export const authenticate = (promptMessage) =>
  LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: 'Cancel' }).then((r) => r.success).catch(() => false);

// Covers the app with a lock screen when App lock is on; re-locks whenever the app goes to the background.
export function LockGate({ children }) {
  const [lockOn, , ready] = useStored('applock', false);
  const [unlocked, setUnlocked] = useState(false);
  const busy = useRef(false);
  const live = useRef({ lockOn, unlocked });
  live.current = { lockOn, unlocked };

  const unlock = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    if (await authenticate('Unlock IPO Allotment')) setUnlocked(true);
    busy.current = false;
  }, []);

  useEffect(() => { if (ready && lockOn && !unlocked) unlock(); }, [ready, lockOn]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'background') setUnlocked(false);
      else if (st === 'active' && live.current.lockOn && !live.current.unlocked) unlock();
    });
    return () => sub.remove();
  }, [unlock]);

  const locked = !ready || (lockOn && !unlocked);
  return (
    <View style={{ flex: 1 }}>
      {children}
      {locked && (
        <View style={[StyleSheet.absoluteFill, s.cover]} accessibilityViewIsModal>
          {ready && (
            <>
              <View style={s.icon}><Feather name="lock" size={30} color={ON_ACCENT} /></View>
              <Text style={s.title}>IPO Allotment is locked</Text>
              <Text style={s.text}>Your saved PANs are protected.</Text>
              <Pressable onPress={unlock} style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]} accessibilityRole="button">
                <Text style={s.btnText}>Unlock</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  cover: { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  icon: { width: 72, height: 72, borderRadius: 24, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontFamily: F.heavy, fontSize: 22, color: C.text },
  text: { fontFamily: F.medium, fontSize: 14, color: C.muted },
  btn: { marginTop: 20, minHeight: 52, minWidth: 180, borderRadius: 16, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: F.bold, fontSize: 16, color: ON_ACCENT },
});
