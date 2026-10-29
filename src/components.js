import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, DARK, F, STATUS, hue } from './theme';

export function StatusChip({ status }) {
  const st = STATUS[status];
  if (!st) {
    // Fallback if status is undefined
    return (
      <View style={[s.chip, { backgroundColor: C.chip, paddingHorizontal: 8, paddingVertical: 3 }]}>
        <View style={[s.dot, { backgroundColor: C.muted, width: 4, height: 4 }]} />
        <Text style={[s.chipText, { color: C.muted }]}>{status || '—'}</Text>
      </View>
    );
  }
  return (
    <View style={[s.chip, { backgroundColor: st.bg, paddingHorizontal: 8, paddingVertical: 3 }]}>
      <View style={[s.dot, { backgroundColor: st.fg, width: 4, height: 4 }]} />
      <Text style={[s.chipText, { color: st.fg }]}>{st.label}</Text>
    </View>
  );
}

export const TypeTag = ({ type }) => {
  if (!type) return <Text style={s.tag}>—</Text>;
  return <Text style={s.tag}>{type === 'sme' ? 'SME' : 'MAINBOARD'}</Text>;
};

export function Avatar({ name, size = 44 }) {
  if (!name) {
    return (
      <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: C.chip, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: F.heavy, fontSize: size * 0.36, color: C.muted }}>?</Text>
      </View>
    );
  }
  const [bg, fg] = hue(name);
  const initials = name.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={{ fontFamily: F.heavy, fontSize: size * 0.36, color: fg }}>{initials || '?'}</Text>
    </View>
  );
}

// Minimal segmented control
export function Segmented({ options, value, onChange, label }) {
  if (!options || options.length === 0) return null;
  return (
    <View style={s.seg} accessibilityRole="tablist" accessibilityLabel={label || 'Options'}>
      {options.map(([k, text]) => {
        const on = value === k;
        return (
          <Pressable key={k} onPress={() => onChange?.(k)} style={[s.segItem, on && s.segOn]} hitSlop={4}
            accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <Text style={[s.segText, on && s.segTextOn]}>{text || '—'}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  dot: { width: 4, height: 4, borderRadius: 2 },
  chipText: { fontFamily: F.bold, fontSize: 11 },
  tag: { fontFamily: F.bold, fontSize: 10, letterSpacing: 0.4, color: C.muted },
  seg: { flexDirection: 'row', backgroundColor: C.chip, borderRadius: 12, padding: 3 },
  segItem: { flex: 1, minHeight: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: C.accent, borderRadius: 8 },
  segText: { fontFamily: F.semibold, fontSize: 13, color: C.muted },
  segTextOn: { color: C.text, fontFamily: F.bold },
});