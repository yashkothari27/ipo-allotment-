import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { C, GLASS, F, NUM, ON_ACCENT, STATUS } from '../../theme';
import { StatusChip, TypeTag } from '../../components';
import { fmtDate, fmtINR, ipoStatus, loadIpos, minInvestment, priceBand } from '../../ipos';

const TIMELINE = [['open', 'Bidding opens'], ['close', 'Bidding closes'], ['allotment', 'Allotment'], ['listing', 'Listing']];
const SUBS = [['qib', 'QIB'], ['nii', 'NII'], ['retail', 'Retail']];
const SUB_COLOR = { qib: STATUS.upcoming.fg, nii: STATUS.closed.fg, retail: STATUS.listed.fg };
const REGISTRAR_NAME = { kfintech: 'KFintech', mufg: 'MUFG Intime', bigshare: 'Bigshare' };

export default function IpoDetail() {
  const { id } = useLocalSearchParams();
  const [ipo, setIpo] = useState();
  const insets = useSafeAreaInsets();

  // shortcut: re-reads the feed per screen; add a shared cache if the feed gets large.
  useEffect(() => { loadIpos().then((f) => setIpo(f.ipos.find((i) => i.id === id) || null)); }, [id]);

  if (ipo === undefined) return <ActivityIndicator style={{ marginTop: 64 }} color={C.accent} />;
  if (ipo === null) {
    return (
      <View style={s.missing}>
        <Feather name="search" size={28} color={C.faint} />
        <Text style={s.missingTitle}>IPO not found</Text>
        <Text style={s.missingText}>It may have been removed from the list.</Text>
      </View>
    );
  }

  const status = ipoStatus(ipo);
  const today = new Date().toISOString().slice(0, 10);
  const sub = ipo.subscription;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[s.page, { paddingBottom: 120 + insets.bottom }]}>
        <View style={s.tags}>
          <TypeTag type={ipo.type} />
          <StatusChip status={status} />
        </View>
        <Text style={s.name} accessibilityRole="header">{ipo.name}</Text>
        <Text style={s.meta}>{ipo.exchange}{ipo.registrar ? `  ·  ${REGISTRAR_NAME[ipo.registrar] || ipo.registrar}` : ''}</Text>

        <View style={s.priceBlock}>
          <Text style={s.priceLabel}>Price band</Text>
          <Text style={[s.price, NUM]}>{priceBand(ipo.priceBand)}</Text>
        </View>

        <View style={s.facts}>
          <Fact label="Lot size" value={ipo.lotSize ? `${ipo.lotSize} shares` : '—'} />
          <View style={s.factRule} />
          <Fact label="Min. investment" value={fmtINR(minInvestment(ipo))} />
          <View style={s.factRule} />
          <Fact label="Issue size" value={ipo.issueSizeCr ? `₹${ipo.issueSizeCr.toLocaleString('en-IN')} Cr` : '—'} />
        </View>

        <Text style={s.h2} accessibilityRole="header">Timeline</Text>
        <View style={s.panel}>
          {TIMELINE.map(([k, label], i) => {
            const d = ipo.dates?.[k];
            const done = d && d <= today;
            const next = !done && TIMELINE.slice(0, i).every(([pk]) => ipo.dates?.[pk] && ipo.dates[pk] <= today);
            return (
              <View key={k} style={s.tlRow} accessible accessibilityLabel={`${label}, ${fmtDate(d)}${done ? ', done' : next ? ', next' : ''}`}>
                <View style={s.tlRail}>
                  <View style={[s.dot, done && s.dotDone, next && s.dotNext]}>
                    {done && <Feather name="check" size={10} color={ON_ACCENT} />}
                  </View>
                  {i < TIMELINE.length - 1 && <View style={[s.line, done && s.lineDone]} />}
                </View>
                <Text style={[s.tlLabel, (done || next) && s.tlStrong]}>{label}</Text>
                <Text style={[s.tlDate, NUM, (done || next) && s.tlStrong]}>{fmtDate(d)}</Text>
              </View>
            );
          })}
        </View>

        <Text style={s.h2} accessibilityRole="header">Subscription</Text>
        <View style={s.panel}>
          {sub ? (
            <>
              {sub.total != null && (
                <View style={s.totalRow}>
                  <Text style={[s.totalVal, NUM]}>{sub.total}×</Text>
                  <Text style={s.totalLabel}>subscribed overall</Text>
                </View>
              )}
              {SUBS.filter(([k]) => sub[k] != null).map(([k, label]) => (
                <SubBar key={k} color={SUB_COLOR[k]} label={label} value={sub[k]} max={Math.max(1, ...SUBS.map(([x]) => sub[x] || 0))} />
              ))}
            </>
          ) : (
            <Text style={s.muted}>Subscription figures appear once bidding opens.</Text>
          )}
        </View>

        {ipo.about && (
          <>
            <Text style={s.h2} accessibilityRole="header">About</Text>
            <Text style={s.about}>{ipo.about}</Text>
          </>
        )}
      </ScrollView>

      {(
        <View style={[s.dock, { paddingBottom: 12 + insets.bottom }]}>
          <Pressable
            style={({ pressed }) => [s.cta, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            onPress={() => router.navigate({ pathname: '/allotment', params: { ipo: ipo.name } })}
          >
            <Feather name="check-square" size={18} color={ON_ACCENT} />
            <Text style={s.ctaText}>Check allotment</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function SubBar({ label, value, max, color }) {
  const grow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return grow.setValue(1);
      Animated.timing(grow, { toValue: 1, duration: 700, easing: Easing.out(Easing.exp), useNativeDriver: true }).start();
    });
  }, [grow]);
  return (
    <View style={s.subRow} accessible accessibilityLabel={`${label} subscribed ${value} times`}>
      <Text style={s.subLabel}>{label}</Text>
      <View style={s.track}>
        <Animated.View style={[s.bar, { backgroundColor: color, width: `${(value / max) * 100}%`, transform: [{ scaleX: grow }], transformOrigin: 'left' }]} />
      </View>
      <Text style={[s.subVal, NUM]}>{value}×</Text>
    </View>
  );
}

const Fact = ({ label, value }) => (
  <View style={s.fact}>
    <Text style={s.factLabel}>{label}</Text>
    <Text style={[s.factValue, NUM]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
  </View>
);

const s = StyleSheet.create({
  page: { paddingHorizontal: 20, paddingTop: 4 },
  tags: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontFamily: F.heavy, fontSize: 28, lineHeight: 33, letterSpacing: -0.6, color: C.text, marginTop: 10 },
  meta: { fontFamily: F.medium, fontSize: 14, color: C.muted, marginTop: 6 },
  priceBlock: { marginTop: 24 },
  priceLabel: { fontFamily: F.semibold, fontSize: 13, color: C.muted },
  price: { fontFamily: F.heavy, fontSize: 40, letterSpacing: -1, color: C.accent, marginTop: 2 },
  facts: { flexDirection: 'row', marginTop: 16, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border },
  fact: { flex: 1 },
  factRule: { width: 1, backgroundColor: C.border, marginHorizontal: 12 },
  factLabel: { fontFamily: F.medium, fontSize: 12, color: C.muted },
  factValue: { fontFamily: F.bold, fontSize: 16, color: C.text, marginTop: 4 },
  h2: { fontFamily: F.bold, fontSize: 17, color: C.text, marginTop: 32, marginBottom: 10 },
  panel: { ...GLASS, borderRadius: 20, padding: 16 },
  tlRow: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 44 },
  tlRail: { width: 18, alignItems: 'center', alignSelf: 'stretch' },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.border, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  dotDone: { borderColor: C.accent, backgroundColor: C.accent },
  dotNext: { borderColor: C.accent },
  line: { flex: 1, width: 2, backgroundColor: C.border, marginVertical: 2 },
  lineDone: { backgroundColor: C.accent },
  tlLabel: { flex: 1, marginLeft: 12, fontFamily: F.medium, fontSize: 15, color: C.muted },
  tlDate: { fontFamily: F.medium, fontSize: 15, color: C.muted },
  tlStrong: { fontFamily: F.bold, color: C.text },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 14 },
  totalVal: { fontFamily: F.heavy, fontSize: 32, letterSpacing: -0.8, color: C.accent },
  totalLabel: { fontFamily: F.medium, fontSize: 14, color: C.muted },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 32 },
  subLabel: { width: 48, fontFamily: F.semibold, fontSize: 14, color: C.text },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: C.chip, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 4, backgroundColor: C.accent },
  subVal: { width: 56, textAlign: 'right', fontFamily: F.bold, fontSize: 14, color: C.text },
  about: { fontFamily: F.regular, fontSize: 15, lineHeight: 23, color: C.text },
  muted: { fontFamily: F.regular, fontSize: 14, color: C.muted },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: C.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  cta: { flexDirection: 'row', gap: 8, backgroundColor: C.accent, borderRadius: 16, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: F.bold, fontSize: 16, color: ON_ACCENT },
  missing: { alignItems: 'center', paddingTop: 80, gap: 8 },
  missingTitle: { fontFamily: F.bold, fontSize: 17, color: C.text },
  missingText: { fontFamily: F.regular, fontSize: 14, color: C.muted },
});
