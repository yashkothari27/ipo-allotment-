import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, DARK, F, STATUS, hue } from './theme';

export function StatusChip({ status }) {
  const st = STATUS[status];
  return (
    <View style={[s.chip, { backgroundColor: st.bg }]}>
      <View style={[s.dot, { backgroundColor: st.fg }]} />
      <Text style={[s.chipText, { color: st.fg }]}>{st.label}</Text>
    </View>
  );
}

export const TypeTag = ({ type }) => (
  <Text style={s.tag}>{type === 'sme' ? 'SME' : 'MAINBOARD'}</Text>
);

export function Avatar({ name, size = 44 }) {
  const [bg, fg] = hue(name);
  const initials = name.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={{ fontFamily: F.heavy, fontSize: size * 0.36, color: fg }}>{initials || '?'}</Text>
    </View>
  );
}

// Segmented control; options = [[value, label], ...]
export function Segmented({ options, value, onChange, label }) {
  return (
    <View style={s.seg} accessibilityRole="tablist" accessibilityLabel={label}>
      {options.map(([k, text]) => {
        const on = value === k;
        return (
          <Pressable key={k} onPress={() => onChange(k)} style={[s.segItem, on && s.segOn]} hitSlop={4}
            accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <Text style={[s.segText, on && s.segTextOn]}>{text}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontFamily: F.bold, fontSize: 12 },
  tag: { fontFamily: F.bold, fontSize: 11, letterSpacing: 0.6, color: C.muted },
  seg: { flexDirection: 'row', backgroundColor: C.chip, borderRadius: 12, padding: 4 },
  segItem: { flex: 1, minHeight: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: C.card, shadowColor: '#101828', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  segText: { fontFamily: F.semibold, fontSize: 14, color: C.muted },
  segTextOn: { color: C.accent, fontFamily: F.bold },
});

// App-wide colour field behind every screen, so glass surfaces have something to refract.
export function Backdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={DARK ? ['#0B1220', '#0E1626', '#120F1E'] : ['#EEF4FB', '#F5F6FA', '#FBF1EE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={[DARK ? 'rgba(56,189,248,0.14)' : 'rgba(186,230,253,0.7)', 'transparent']} start={{ x: 1, y: 0 }} end={{ x: 0.3, y: 0.6 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['transparent', DARK ? 'rgba(251,146,60,0.08)' : 'rgba(254,215,170,0.5)']} start={{ x: 0.6, y: 0.4 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['transparent', DARK ? 'rgba(244,114,182,0.07)' : 'rgba(251,207,232,0.45)']} start={{ x: 0.3, y: 0.5 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    </View>
  );
}
