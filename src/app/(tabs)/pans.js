import { useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useShareIntentContext } from 'expo-share-intent';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { extractPans } from '../../registrars';
import { useStored } from '../../store';
import { C, DARK, F, NUM, ON_ACCENT } from '../../theme';
import { Avatar } from '../../components';

const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export default function Pans() {
  const insets = useSafeAreaInsets();
  const [pans, savePans] = useStored('pans'); // [{ pan, label }]
  const [open, setOpen] = useState(false);
  const [pan, setPan] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  const save = (next) => savePans(next).catch(() => Alert.alert("Couldn't save", 'Your PAN list was not saved. Try again.'));
  const addPans = (list, lbl) => {
    const fresh = list.filter((p) => !pans.some((x) => x.pan === p));
    if (fresh.length) save([...pans, ...fresh.map((p) => ({ pan: p, label: lbl || p }))]);
    return fresh.length;
  };

  // PAN shared from WhatsApp / Notes / SMS etc.
  useEffect(() => {
    if (!hasShareIntent) return;
    const found = extractPans(shareIntent.text || '');
    if (!found.length) Alert.alert('No PAN found', 'The shared text has no PAN in the ABCDE1234F format.');
    else {
      const n = addPans(found, 'Shared');
      Alert.alert(n ? `Added ${n} PAN${n > 1 ? 's' : ''}` : 'Already saved', n ? 'Saved under the name "Shared". Tap it to rename.' : 'These PANs are already in your list.');
    }
    resetShareIntent();
  }, [hasShareIntent]);

  const close = () => { setOpen(false); setPan(''); setLabel(''); setError(''); };
  const onSave = () => {
    const value = pan.trim().toUpperCase();
    if (!PAN.test(value)) return setError('Enter a valid PAN, like ABCDE1234F.');
    if (!addPans([value], label.trim())) return setError('This PAN is already saved.');
    close();
  };
  const onRemove = (x) => Alert.alert(`Remove ${x.label}?`, x.pan, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => save(pans.filter((p) => p.pan !== x.pan)) },
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={pans}
        keyExtractor={(x) => x.pan}
        contentContainerStyle={[s.list, { paddingTop: insets.top + 16 }]}
        ListHeaderComponent={
          <View style={s.head}>
            <Text style={s.title} accessibilityRole="header">PANs</Text>
            <Text style={s.sub}>{pans.length ? `${pans.length} saved · checked together on the Allotment tab` : 'Saved only on this phone'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <Avatar name={item.label} size={46} />
            <View style={{ flex: 1 }}>
              <Text style={s.name} numberOfLines={1}>{item.label}</Text>
              <Text style={[s.pan, NUM]}>{item.pan}</Text>
            </View>
            <Pressable onPress={() => onRemove(item)} hitSlop={8} style={({ pressed }) => [s.del, pressed && { opacity: 0.6 }]}
              accessibilityRole="button" accessibilityLabel={`Remove ${item.label}`}>
              <Feather name="trash-2" size={18} color={C.danger} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIcon}><Feather name="credit-card" size={26} color={C.accent} /></View>
            <Text style={s.emptyTitle}>No PANs yet</Text>
            <Text style={s.emptyText}>Add your family's PANs once and check every IPO allotment in one tap. You can also share a message with a PAN to this app.</Text>
          </View>
        }
      />

      <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [s.fab, { bottom: 20 }, pressed && { transform: [{ scale: 0.96 }] }]}
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
  list: { paddingHorizontal: 16, paddingBottom: 110, gap: 10 },
  head: { marginBottom: 10 },
  title: { fontFamily: F.heavy, fontSize: 30, letterSpacing: -0.6, color: C.text },
  sub: { fontFamily: F.medium, fontSize: 14, color: C.muted, marginTop: 2 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card, borderRadius: 20, padding: 14, borderWidth: DARK ? 1 : 0, borderColor: C.border },
  name: { fontFamily: F.bold, fontSize: 16, color: C.text },
  pan: { fontFamily: F.semibold, fontSize: 14, letterSpacing: 1.2, color: C.muted, marginTop: 2 },
  del: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 56, paddingHorizontal: 24 },
  emptyIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontFamily: F.bold, fontSize: 17, color: C.text },
  emptyText: { fontFamily: F.regular, fontSize: 14, lineHeight: 21, color: C.muted, textAlign: 'center' },
  fab: { position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.accent, borderRadius: 18, paddingHorizontal: 20, minHeight: 56, shadowColor: '#047857', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  fabText: { fontFamily: F.bold, fontSize: 16, color: ON_ACCENT },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,8,23,0.5)' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, marginBottom: 14 },
  sheetTitle: { fontFamily: F.heavy, fontSize: 22, color: C.text, marginBottom: 16 },
  label: { fontFamily: F.semibold, fontSize: 13, color: C.text, marginBottom: 6 },
  input: { fontFamily: F.semibold, fontSize: 16, color: C.text, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, height: 50, backgroundColor: C.bg },
  error: { fontFamily: F.medium, fontSize: 13, color: C.danger, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btn: { flex: 1, minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: F.bold, fontSize: 16, color: ON_ACCENT },
});
