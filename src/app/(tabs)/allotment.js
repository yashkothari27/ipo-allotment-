import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { REGISTRARS, checkAll } from '../../registrars';
import { useStored } from '../../store';
import { C, DARK, F, NUM, ON_ACCENT } from '../../theme';
import { Avatar } from '../../components';

const RESULT = {
  allotted: { text: 'Allotted', fg: C.accent, bg: C.accentSoft, icon: 'check-circle' },
  not_allotted: { text: 'Not allotted', fg: C.danger, bg: C.dangerSoft, icon: 'x-circle' },
  not_found: { text: 'No application', fg: C.muted, bg: C.chip, icon: 'minus-circle' },
  error: { text: "Couldn't check", fg: C.warn, bg: C.warnSoft, icon: 'alert-triangle' },
};

export default function Allotment() {
  const [pans] = useStored('pans'); // managed on the PANs tab
  const insets = useSafeAreaInsets();
  const [companies, setCompanies] = useState(null);
  const [listError, setListError] = useState('');
  const [company, setCompany] = useState(null);
  const [results, setResults] = useState({});
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const params = useLocalSearchParams();

  // One merged IPO list from every registrar; each entry remembers which registrar to ask.
  useEffect(() => {
    Promise.allSettled(Object.entries(REGISTRARS).map(([reg, r]) => r.companies().then((list) => list.map((c) => ({ ...c, reg })))))
      .then((res) => {
        const lists = res.filter((x) => x.status === 'fulfilled').map((x) => x.value);
        // shortcut: registrars send no dates but list newest first, so interleave them to keep the latest on top.
        const ok = Array.from({ length: Math.max(0, ...lists.map((l) => l.length)) }, (_, i) => lists.map((l) => l[i])).flat().filter(Boolean);
        const failed = res.length - lists.length;
        if (failed) setListError(ok.length ? "Some registrars didn't respond, so a few IPOs may be missing." : "Couldn't load the IPO list. Check your connection.");
        setCompanies(ok);
      });
  }, []);

  // "Check allotment" on an IPO page: filter by the company's first word and select it if that leaves one match.
  useEffect(() => {
    if (!params.ipo || !companies) return;
    const word = String(params.ipo).split(/\s+/)[0];
    setQ(word);
    const hits = companies.filter((c) => c.name.toLowerCase().includes(word.toLowerCase()));
    if (hits.length === 1) { setCompany(hits[0]); setResults({}); }
  }, [params.ipo, companies]);

  const shown = companies?.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase())) || [];
  const done = Object.values(results);
  const finished = !busy && done.length > 0 && done.every((r) => r.status !== 'checking');
  const won = done.filter((r) => r.status === 'allotted');
  const shares = won.reduce((n, r) => n + r.allotted, 0);

  const off = busy || (pans.length > 0 && !company); // with no PANs the button jumps to the PANs tab

  const onCheck = async () => {
    setBusy(true);
    setResults(Object.fromEntries(pans.map((x) => [x.pan, { status: 'checking' }])));
    await checkAll(company.reg, company.id, pans.map((x) => x.pan), (p, r) => setResults((prev) => ({ ...prev, [p]: r })));
    setBusy(false);
  };

  return (
    <ScrollView contentContainerStyle={[s.page, { paddingTop: insets.top + 16 }]}>
      <Text style={s.title} accessibilityRole="header">Allotment</Text>
      <Text style={s.sub}>Pick an IPO, then check every saved PAN at once.</Text>

      <Text style={s.h2} accessibilityRole="header">IPO</Text>
      <View style={s.search}>
        <Feather name="search" size={18} color={C.muted} />
        <TextInput style={s.searchInput} value={q} onChangeText={setQ} placeholder="Search IPO name" placeholderTextColor={C.faint}
          autoCorrect={false} accessibilityLabel="Search IPO name" returnKeyType="search" />
        {!!q && (
          <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
            <Feather name="x-circle" size={18} color={C.muted} />
          </Pressable>
        )}
      </View>
      <View style={s.panel}>
        {!!listError && <Text style={s.errorText}>{listError}</Text>}
        {!companies ? (
          <ActivityIndicator style={{ padding: 20 }} color={C.accent} />
        ) : (
          <ScrollView style={{ maxHeight: 320 }} nestedScrollEnabled>
            {!shown.length && <Text style={[s.optionText, { paddingVertical: 16, color: C.muted }]}>No IPO matches "{q}".</Text>}
            {shown.map((c, i) => {
              const on = company?.id === c.id && company?.reg === c.reg;
              return (
                <Pressable key={`${c.reg}:${c.id}`} onPress={() => { setCompany(c); setResults({}); }}
                  style={({ pressed }) => [s.option, i > 0 && s.optionRule, pressed && s.pressed]}
                  accessibilityRole="radio" accessibilityState={{ checked: on }}>
                  <View style={[s.radio, on && s.radioOn]}>{on && <View style={s.radioDot} />}</View>
                  <Text style={[s.optionText, on && s.optionTextOn]}>{c.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      <Pressable style={({ pressed }) => [s.cta, off && s.ctaOff, pressed && !off && { opacity: 0.85 }]}
        disabled={off} onPress={pans.length ? onCheck : () => router.navigate('/pans')} accessibilityRole="button" accessibilityState={{ disabled: off, busy }}>
        {busy ? <ActivityIndicator color={ON_ACCENT} /> : <Feather name="search" size={18} color={ON_ACCENT} />}
        <Text style={s.ctaText}>
          {busy ? 'Checking…' : !pans.length ? 'Add a PAN to check' : !company ? 'Pick an IPO to check' : `Check ${pans.length} PAN${pans.length === 1 ? '' : 's'}`}
        </Text>
      </Pressable>

      {finished && (
        <View style={[s.summary, { backgroundColor: won.length ? C.accentSoft : C.chip }]} accessibilityLiveRegion="polite">
          <View style={[s.summaryIcon, { backgroundColor: won.length ? C.accent : C.muted }]}>
            <Feather name={won.length ? 'award' : 'info'} size={22} color={ON_ACCENT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.summaryTitle}>
              {won.length ? `${won.length} of ${done.length} PAN${done.length === 1 ? '' : 's'} got shares` : 'No allotment this time'}
            </Text>
            <Text style={s.summaryText}>
              {won.length ? `${shares} shares in total in ${company?.name}.` : 'Refunds usually reach the bank account within 1–2 working days.'}
            </Text>
          </View>
        </View>
      )}

      <View style={s.panHead}>
        <Text style={[s.h2, { marginTop: 0, marginBottom: 0 }]} accessibilityRole="header">Your PANs</Text>
        <Pressable onPress={() => router.navigate('/pans')} style={s.addBtn} hitSlop={8} accessibilityRole="button">
          <Feather name="edit-2" size={15} color={C.accent} />
          <Text style={s.addText}>Manage</Text>
        </Pressable>
      </View>

      {pans.length === 0 ? (
        <View style={s.empty}>
          <Feather name="credit-card" size={28} color={C.faint} />
          <Text style={s.emptyTitle}>No PANs saved yet</Text>
          <Text style={s.emptyText}>Add PANs on the PANs tab, then come back to check them all at once.</Text>
        </View>
      ) : (
        <View style={[s.panel, { paddingVertical: 4 }]}>
          {pans.map((x, i) => {
            const r = results[x.pan];
            const res = r && RESULT[r.status];
            return (
              <View key={x.pan} style={i > 0 && s.optionRule}>
              <View style={s.panRow}>
                <Avatar name={x.label} size={38} />
                <View style={{ flex: 1 }}>
                  <Text style={s.panLabel} numberOfLines={1}>{x.label}</Text>
                  <Text style={[s.panText, NUM]}>{x.pan}</Text>
                </View>
                {r?.status === 'checking' ? (
                  <ActivityIndicator color={C.accent} accessibilityLabel="Checking" />
                ) : res ? (
                  <View style={[s.result, { backgroundColor: res.bg }]} accessible
                    accessibilityLabel={`${res.text}${r.status === 'allotted' ? `, ${r.allotted} shares` : ''}${r.message ? `, ${r.message}` : ''}`}>
                    <Feather name={res.icon} size={14} color={res.fg} />
                    <Text style={[s.resultText, { color: res.fg }]}>
                      {res.text}{r.status === 'allotted' ? ` · ${r.allotted}` : ''}
                    </Text>
                  </View>
                ) : null}
              </View>
              {r?.apps?.length > 1 || r?.apps?.[0]?.category ? (
                <View style={s.apps}>
                  {r.apps.map((a, j) => (
                    <View key={a.no || j} style={s.app} accessible
                      accessibilityLabel={`${a.category || `Application ${j + 1}`}: ${a.allotted} of ${a.applied} shares allotted`}>
                      <View style={[s.appDot, { backgroundColor: a.allotted ? C.accent : C.faint }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.appCat}>{a.category || `Application ${j + 1}`}</Text>
                        {!!a.no && <Text style={[s.appNo, NUM]}>No. {a.no}</Text>}
                      </View>
                      <Text style={[s.appVal, NUM, { color: a.allotted ? C.accent : C.muted }]}>{a.allotted} / {a.applied}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 16, paddingHorizontal: 14, minHeight: 48, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, fontFamily: F.medium, fontSize: 15, color: C.text, paddingVertical: 10 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20, padding: 16, marginTop: 16 },
  summaryIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontFamily: F.heavy, fontSize: 17, color: C.text },
  summaryText: { fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: C.muted, marginTop: 2 },
  page: { paddingHorizontal: 16, paddingBottom: 40 },
  title: { fontFamily: F.heavy, fontSize: 30, letterSpacing: -0.6, color: C.text },
  sub: { fontFamily: F.medium, fontSize: 14, color: C.muted, marginTop: 2 },
  h2: { fontFamily: F.bold, fontSize: 15, color: C.text, marginTop: 20, marginBottom: 8 },
  panel: { backgroundColor: C.card, borderRadius: 20, paddingHorizontal: 16, borderWidth: DARK ? 1 : 0, borderColor: C.border },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 10 },
  optionRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  pressed: { opacity: 0.6 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.faint, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: C.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },
  optionText: { flex: 1, fontFamily: F.medium, fontSize: 15, color: C.text },
  optionTextOn: { fontFamily: F.bold },
  cta: { flexDirection: 'row', gap: 8, marginTop: 16, backgroundColor: C.accent, borderRadius: 16, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  ctaOff: { opacity: 0.45 },
  ctaText: { fontFamily: F.bold, fontSize: 16, color: ON_ACCENT },
  panHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 4 },
  addText: { fontFamily: F.bold, fontSize: 15, color: C.accent },
  errorText: { fontFamily: F.medium, fontSize: 13, color: C.danger, marginTop: 6, padding: 2 },
  panRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 },
  panLabel: { fontFamily: F.bold, fontSize: 15, color: C.text },
  panText: { fontFamily: F.medium, fontSize: 13, color: C.muted, letterSpacing: 0.8, marginTop: 1 },
  apps: { marginLeft: 50, marginBottom: 12, backgroundColor: C.bg, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4 },
  app: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  appDot: { width: 8, height: 8, borderRadius: 4 },
  appCat: { fontFamily: F.bold, fontSize: 13, color: C.text },
  appNo: { fontFamily: F.medium, fontSize: 11, color: C.muted },
  appVal: { fontFamily: F.heavy, fontSize: 14 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  resultText: { fontFamily: F.bold, fontSize: 12 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 36, paddingHorizontal: 24 },
  emptyTitle: { fontFamily: F.bold, fontSize: 16, color: C.text },
  emptyText: { fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: C.muted, textAlign: 'center' },
});
