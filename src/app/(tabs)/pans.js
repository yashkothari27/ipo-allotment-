import { useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useShareIntentContext } from 'expo-share-intent';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { extractPans } from '../../registrars';
import { maskPan, panName, useStored } from '../../store';
import { authenticate } from '../../lock';
import { disableAlerts, enableAlerts } from '../../alerts';
import { C, GLASS, DARK, F, NUM, ON_ACCENT } from '../../theme';
import { Avatar } from '../../components';
import { FadeIn } from '../../motion';

const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export default function Pans() {
  const insets = useSafeAreaInsets();
  const [pans, savePans] = useStored('pans'); // [{ pan, label }]
  const [open, setOpen] = useState(false);
  const [pan, setPan] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  const [shown, setShown] = useState(null); // PAN currently revealed
  const [lockOn, saveLock] = useStored('applock', false);
  const [alertsOn, saveAlerts] = useStored('allotAlerts', false);
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  const save = (next) => savePans(next).catch(() => Alert.alert("Couldn't save", 'Your PAN list was not saved. Try again.'));
  const addPans = (list, lbl) => {
    const fresh = list.filter((p) => !pans.some((x) => x.pan === p));
    if (fresh.length) save([...pans, ...fresh.map((p) => ({ pan: p, label: lbl || '' }))]);
    return fresh.length;
  };

  // PAN shared from WhatsApp / Notes / SMS etc.
  useEffect(() => {
    if (!hasShareIntent) return;
    const found = extractPans(shareIntent.text || '');
    if (!found.length) Alert.alert('No PAN found', 'The shared text has no PAN in the ABCDE1234F format.');
    else {
      const n = addPans(found, 'Shared');
      Alert.alert(n ? `Added ${n} PAN${n > 1 ? 's' : ''}` : 'Already saved', n ? 'Saved under the name "Shared".' : 'These PANs are already in your list.');
    }
    resetShareIntent();
  }, [hasShareIntent]);

  const toggleAlerts = async (on) => {
    if (!on) { await disableAlerts(); return saveAlerts(false); }
    if (!(await enableAlerts())) {
      return Alert.alert('Notifications are off', 'Allow notifications for IPO Desk in your phone settings to get allotment alerts.');
    }
    saveAlerts(true);
  };

  const toggleLock = async (on) => {
    if (on && (await LocalAuthentication.getEnrolledLevelAsync()) === LocalAuthentication.SecurityLevel.NONE) {
      return Alert.alert('Set up a screen lock first', 'Add a fingerprint, face or PIN in your phone settings, then turn on App lock.');
    }
    // Confirm with the device lock both ways, so someone holding an unlocked phone can't quietly switch it off.
    if (await authenticate(on ? 'Turn on App lock' : 'Turn off App lock')) saveLock(on);
  };

  const close = () => { setOpen(false); setPan(''); setLabel(''); setError(''); };
  const onSave = () => {
    const value = pan.trim().toUpperCase();
    if (!PAN.test(value)) return setError('Enter a valid PAN, like ABCDE1234F.');
    if (!addPans([value], label.trim())) return setError('This PAN is already saved.');
    close();
  };
  const onRemove = (x) => Alert.alert(`Remove ${panName(x)}?`, maskPan(x.pan), [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => save(pans.filter((p) => p.pan !== x.pan)) },
  ]);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={pans}
        keyExtractor={(x) => x.pan}
        contentContainerStyle={[s.list, { paddingTop: insets.top + 16 }]}
        ListHeaderComponent={
          <View style={s.head}>
            <Text style={s.title} accessibilityRole="header">PANs</Text>
            <Text style={s.sub}>{pans.length ? `${pans.length} saved · encrypted on this phone` : 'Encrypted and saved only on this phone'}</Text>
            <View style={s.lockRow}>
              <View style={s.lockIcon}><Feather name="lock" size={18} color={C.accent} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.name} nativeID="lockL">App lock</Text>
                <Text style={s.lockHint}>Ask for fingerprint, face or PIN when opening the app</Text>
              </View>
              <Switch value={lockOn} onValueChange={toggleLock} accessibilityLabelledBy="lockL"
                trackColor={{ true: C.accent, false: C.border }} thumbColor="#fff" />
            </View>
            <View style={[s.lockRow, { marginTop: 10 }]}>
              <View style={s.lockIcon}><Feather name="bell" size={18} color={C.accent} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.name} nativeID="alertL">Allotment alerts</Text>
                <Text style={s.lockHint}>Notify me when results are out for my saved PANs</Text>
              </View>
              <Switch value={alertsOn} onValueChange={toggleAlerts} accessibilityLabelledBy="alertL"
                trackColor={{ true: C.accent, false: C.border }} thumbColor="#fff" />
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <FadeIn index={index}><View style={s.card}>
            <Avatar name={panName(item)} size={46} />
            <Pressable style={{ flex: 1 }} onPress={() => setShown(shown === item.pan ? null : item.pan)} accessibilityRole="button"
              accessibilityLabel={`${panName(item)}. ${shown === item.pan ? item.pan.split('').join(' ') : 'PAN hidden'}`} accessibilityHint="Shows or hides the full PAN">
              {!!item.label && <Text style={s.name} numberOfLines={1}>{item.label}</Text>}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[item.label ? s.pan : s.name, NUM]}>{shown === item.pan ? item.pan : maskPan(item.pan)}</Text>
                <Feather name={shown === item.pan ? 'eye-off' : 'eye'} size={14} color={C.muted} style={{ marginTop: 2 }} />
              </View>
            </Pressable>
            <Pressable onPress={() => onRemove(item)} hitSlop={8} style={({ pressed }) => [s.del, pressed && { opacity: 0.6 }]}
              accessibilityRole="button" accessibilityLabel={`Remove ${panName(item)}`}>
              <Feather name="trash-2" size={18} color={C.danger} />
            </Pressable>
          </View></FadeIn>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIcon}><Feather name="credit-card" size={26} color={C.accent} /></View>
            <Text style={s.emptyTitle}>No PANs yet</Text>
            <Text style={s.emptyText}>Add your family's PANs once and check every IPO allotment in one tap. You can also share a message with a PAN to this app.</Text>
          </View>
        }
      />

      <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [s.fab, { bottom: insets.bottom + 92 }, pressed && { transform: [{ scale: 0.96 }] }]}
        accessibilityRole="button" accessibilityLabel="Add PAN">
        <Feather name="plus" size={22} color={ON_ACCENT} />
        <Text style={s.fabText}>Add PAN</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close" />
          <View style={[s.sheet, { paddingBottom: 20 + insets.bottom }]}>
            <View style={s.grabber} />
            <Text style={s.sheetTitle}>Add a PAN</Text>
            <Text style={s.label} nativeID="panL">PAN</Text>
            <TextInput style={[s.input, NUM, !!error && { borderColor: C.danger }]} value={pan}
              onChangeText={(t) => { setPan(t.toUpperCase()); setError(''); }} autoCapitalize="characters" autoCorrect={false}
              maxLength={10} placeholder="ABCDE1234F" placeholderTextColor={C.faint} accessibilityLabelledBy="panL" autoFocus />
            {!!error && <Text style={s.error} accessibilityLiveRegion="polite">{error}</Text>}
            <Text style={[s.label, { marginTop: 14 }]} nativeID="nameL">Name <Text style={{ fontFamily: F.regular, color: C.muted }}>(optional)</Text></Text>
            <TextInput style={s.input} value={label} onChangeText={setLabel} placeholder="e.g. Mom" placeholderTextColor={C.faint}
              accessibilityLabelledBy="nameL" returnKeyType="done" onSubmitEditing={onSave} />
            <View style={s.actions}>
              <Pressable onPress={close} style={[s.btn, { backgroundColor: C.chip }]} accessibilityRole="button">
                <Text style={[s.btnText, { color: C.text }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={onSave} style={[s.btn, { backgroundColor: C.accent }]} accessibilityRole="button">
                <Text style={s.btnText}>Save PAN</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 200, gap: 10 },
  head: { marginBottom: 10 },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 12, ...GLASS, borderRadius: 12, padding: 14, marginTop: 16 },
  lockIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  lockHint: { fontFamily: F.regular, fontSize: 12, color: C.muted, marginTop: 1 },
  title: { fontFamily: F.heavy, fontSize: 30, letterSpacing: -0.6, color: C.text },
  sub: { fontFamily: F.medium, fontSize: 14, color: C.muted, marginTop: 2 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, ...GLASS, borderRadius: 12, padding: 14 },
  name: { fontFamily: F.bold, fontSize: 16, color: C.text },
  pan: { fontFamily: F.semibold, fontSize: 14, letterSpacing: 1.2, color: C.muted, marginTop: 2 },
  del: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 56, paddingHorizontal: 24 },
  emptyIcon: { width: 60, height: 60, borderRadius: 12, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontFamily: F.bold, fontSize: 17, color: C.text },
  emptyText: { fontFamily: F.regular, fontSize: 14, lineHeight: 21, color: C.muted, textAlign: 'center' },
  fab: { position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 20, minHeight: 56, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  fabText: { fontFamily: F.bold, fontSize: 16, color: ON_ACCENT },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, marginBottom: 14 },
  sheetTitle: { fontFamily: F.heavy, fontSize: 22, color: C.text, marginBottom: 16 },
  label: { fontFamily: F.semibold, fontSize: 13, color: C.text, marginBottom: 6 },
  input: { fontFamily: F.semibold, fontSize: 16, color: C.text, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, height: 50, backgroundColor: C.bg },
  error: { fontFamily: F.medium, fontSize: 13, color: C.danger, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btn: { flex: 1, minHeight: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: F.bold, fontSize: 16, color: ON_ACCENT },
});
