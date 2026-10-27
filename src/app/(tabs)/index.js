import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { C, GLASS, DARK, F, NUM, ON_ACCENT, STATUS } from '../../theme';
import { Avatar, StatusChip } from '../../components';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurTargetView, BlurView } from 'expo-blur';
import { CountUp, FadeIn, Marquee, PressScale, Shimmer, useReduceMotion } from '../../motion';
import { useStored } from '../../store';
import { fmtDate, fmtINR, ipoStatus, loadIpos, minInvestment, priceBand, sortIpos } from '../../ipos';

const TABS = [['open', 'Open'], ['upcoming', 'Upcoming'], ['closed', 'Closed'], ['listed', 'Listed'], ['watch', 'Watchlist']];
const TYPES = [['all', 'All'], ['mainboard', 'Mainboard'], ['sme', 'SME']];

export default function IpoList() {
  const insets = useSafeAreaInsets();
  const [feed, setFeed] = useState(null);
  const [tab, setTab] = useState('open');
  const [type, setType] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [watch, saveWatch] = useStored('watchlist');

  const load = useCallback(async () => {
    setRefreshing(true);
    setFeed(await loadIpos());
    setRefreshing(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Sliding pill behind the selected status tab.
  const reduce = useReduceMotion();
  const layouts = useRef({});
  const pillX = useRef(new Animated.Value(0)).current;
  const pillW = useRef(new Animated.Value(0)).current;
  const movePill = (k, animate) => {
    const l = layouts.current[k];
    if (!l) return;
    const cfg = { stiffness: 260, damping: 26, useNativeDriver: false };
    if (!animate || reduce) { pillX.setValue(l.x); pillW.setValue(l.width); return; }
    Animated.parallel([Animated.spring(pillX, { toValue: l.x, ...cfg }), Animated.spring(pillW, { toValue: l.width, ...cfg })]).start();
  };
  const onTabLayout = (k, l) => { layouts.current[k] = l; if (k === tab) movePill(k, false); };
  useEffect(() => { movePill(tab, true); }, [tab]);

  const all = feed ? sortIpos(feed.ipos) : [];
  const count = (k) => all.filter((i) => ipoStatus(i) === k).length;
  const list = all
    .filter((i) => (tab === 'watch' ? watch.includes(i.id) : ipoStatus(i) === tab))
    .filter((i) => type === 'all' || i.type === type);
  const listRef = useRef(null);
  const ticker = all.filter((i) => ipoStatus(i) === 'open');
  const toggleWatch = (id) => saveWatch(watch.includes(id) ? watch.filter((x) => x !== id) : [...watch, id]);

  return (
    <View style={{ flex: 1 }}>
      <View style={[s.hero, { marginTop: insets.top + 8 }]}>
        {/* Glass sheen: light catching the top-left of the pane */}
        <LinearGradient colors={[DARK ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.75)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 0.7 }} style={StyleSheet.absoluteFill} />
        <Text style={s.kicker}>IPO desk</Text>
        <Text style={s.title} accessibilityRole="header">Every issue, one place</Text>
        <View style={s.stats}>
          {['open', 'upcoming', 'closed'].map((k) => (
            <View key={k} style={s.stat}>
              {feed ? <CountUp value={count(k)} style={[s.statNum, NUM, k === 'open' && { color: C.lime }]} /> : <Text style={s.statNum}>–</Text>}
              <Text style={s.statLabel}>{STATUS[k].label}</Text>
            </View>
          ))}
        </View>
        {ticker.length > 0 && (
          <Marquee style={s.ticker}>
            {ticker.map((i) => (
              <View key={i.id} style={s.tick}>
                <View style={s.tickDot} />
                <Text style={s.tickName} numberOfLines={1}>{i.name}</Text>
                <Text style={[s.tickVal, NUM]}>{i.subscription?.total != null ? `${i.subscription.total}x` : priceBand(i.priceBand)}</Text>
              </View>
            ))}
          </Marquee>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs} style={s.tabsBar} accessibilityRole="tablist">
        <Animated.View pointerEvents="none" style={[s.pill, { width: pillW, transform: [{ translateX: pillX }] }]} />
        {TABS.map(([k, label]) => {
          const on = tab === k;
          return (
            <Pressable key={k} onPress={() => setTab(k)} onLayout={(e) => onTabLayout(k, e.nativeEvent.layout)} style={s.tab} accessibilityRole="tab" accessibilityState={{ selected: on }}>
              {k === 'watch' && <Feather name="star" size={14} color={on ? ON_ACCENT : C.muted} />}
              <Text style={[s.tabText, on && s.tabTextOn]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <BlurTargetView ref={listRef} style={{ flex: 1 }}>
      <FlatList
        data={list}
        keyExtractor={(i) => i.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} colors={[C.accent]} tintColor={C.accent} />}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <View style={s.types}>
              {TYPES.map(([k, label]) => (
                <Pressable key={k} onPress={() => setType(k)} style={[s.type, type === k && s.typeOn]} accessibilityRole="button" accessibilityState={{ selected: type === k }}>
                  <Text style={[s.typeText, type === k && s.typeTextOn]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            {feed?.error && (
              <View style={s.banner}>
                <Feather name="wifi-off" size={16} color={C.warn} />
                <Text style={s.bannerText}>Couldn't refresh. Showing the last saved list. Pull down to retry.</Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <FadeIn index={index} key={`${tab}-${type}-${item.id}`}>
            <IpoCard ipo={item} watched={watch.includes(item.id)} onWatch={() => toggleWatch(item.id)} />
          </FadeIn>
        )}
        ListEmptyComponent={
          !feed ? <Skeleton /> : (
            <View style={s.empty}>
              <View style={s.emptyIcon}><Feather name={tab === 'watch' ? 'star' : 'inbox'} size={24} color={C.accent} /></View>
              <Text style={s.emptyTitle}>{tab === 'watch' ? 'Nothing on your watchlist' : `No ${TABS.find((t) => t[0] === tab)[1].toLowerCase()} IPOs`}</Text>
              <Text style={s.emptyText}>{tab === 'watch' ? 'Tap the star on any IPO to keep it here.' : 'Pull down to refresh, or check another tab.'}</Text>
            </View>
          )
        }
        ListFooterComponent={feed?.updatedAt && (
          <View style={{ gap: 4, marginTop: 8 }}>
            <Text style={s.footer}>List updated {fmtDate(feed.updatedAt)}</Text>
            {/* Attribution required by IPO Guru's API terms. */}
            {feed.attribution && (
              <Text style={[s.footer, { color: C.accent }]} onPress={() => Linking.openURL('https://www.ipoguru.in/')} accessibilityRole="link">
                IPO data by IPO Guru
              </Text>
            )}
          </View>
        )}
      />
      </BlurTargetView>
      {/* Blur vignette: cards soften and fade as they slide under the floating tab bar. */}
      <View pointerEvents="none" style={s.vignette}>
        <BlurView blurTarget={listRef} blurMethod="dimezisBlurViewSdk31Plus" intensity={30} tint={DARK ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={[C.bg + '00', C.bg + '99', C.bg + 'E6']} style={StyleSheet.absoluteFill} />
      </View>
    </View>
  );
}

function IpoCard({ ipo, watched, onWatch }) {
  const status = ipoStatus(ipo);
  const sub = ipo.subscription?.total;
  const metrics = [
    ['Price band', priceBand(ipo.priceBand)],
    ['Min. invest', fmtINR(minInvestment(ipo))],
    status === 'upcoming' ? ['Lot size', ipo.lotSize ? `${ipo.lotSize} sh` : '—'] : ['Subscribed', sub != null ? `${sub}x` : '—'],
  ];
  return (
    <PressScale onPress={() => router.push(`/ipo/${ipo.id}`)} style={s.card}
      accessibilityRole="button" accessibilityLabel={`${ipo.name}, ${STATUS[status].label}, price band ${priceBand(ipo.priceBand)}`}>
      <View style={[s.stripe, { backgroundColor: STATUS[status].fg }]} />
      <View style={s.cardTop}>
        <Avatar name={ipo.name} />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={s.nameRow}>
            <Text style={s.name} numberOfLines={1}>{ipo.name}</Text>
            {ipo.type === 'sme' && <Text style={s.sme}>SME</Text>}
          </View>
          <Text style={[s.dates, NUM]}>{fmtDate(ipo.dates?.open)} – {fmtDate(ipo.dates?.close)}{ipo.exchange ? ` · ${ipo.exchange}` : ''}</Text>
        </View>
        <Pressable onPress={onWatch} hitSlop={10} style={s.star} accessibilityRole="button" accessibilityLabel={watched ? 'Remove from watchlist' : 'Add to watchlist'}>
          <Feather name="star" size={20} color={watched ? C.star : C.faint} />
        </Pressable>
      </View>
      <View style={s.metrics}>
        {metrics.map(([k, v]) => (
          <View key={k} style={{ flex: 1 }}>
            <Text style={s.mLabel}>{k}</Text>
            <Text style={[s.mValue, NUM]} numberOfLines={1}>{v}</Text>
          </View>
        ))}
      </View>
      <View style={s.cardFoot}>
        <StatusChip status={status} />
        {ipo.dates?.allotment && <Text style={s.footNote}>Allotment {fmtDate(ipo.dates.allotment)}</Text>}
      </View>
    </PressScale>
  );
}

const Skeleton = () => (
  <View style={{ gap: 12 }} accessibilityLabel="Loading IPOs">
    {[0, 1, 2].map((i) => (
      <View key={i} style={[s.card, { gap: 12 }]}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Shimmer style={{ width: 44, height: 44, borderRadius: 13 }} />
          <View style={{ flex: 1, gap: 8 }}>
            <Shimmer style={{ height: 14, borderRadius: 7, width: '70%' }} />
            <Shimmer style={{ height: 10, borderRadius: 5, width: '45%' }} />
          </View>
        </View>
        <Shimmer style={{ height: 58, borderRadius: 14 }} />
      </View>
    ))}
  </View>
);

const s = StyleSheet.create({
  hero: { ...GLASS, marginHorizontal: 12, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 18, borderRadius: 30, overflow: 'hidden' },
  kicker: { fontFamily: F.bold, fontSize: 12, letterSpacing: 1.2, color: C.muted, textTransform: 'uppercase' },
  title: { fontFamily: F.heavy, fontSize: 26, color: C.text, letterSpacing: -0.5, marginTop: 4 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 16 },
  stat: { flex: 1, backgroundColor: DARK ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: DARK ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.8)', borderTopColor: DARK ? 'rgba(255,255,255,0.2)' : '#FFFFFF', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 12 },
  statNum: { fontFamily: F.heavy, fontSize: 22, color: C.text },
  statLabel: { fontFamily: F.medium, fontSize: 12, color: C.muted },
  tabsBar: { flexGrow: 0 },
  tabs: { gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 16, borderRadius: 999 },
  pill: { position: 'absolute', left: 0, top: 14, height: 40, borderRadius: 999, backgroundColor: C.accent },
  ticker: { marginTop: 14, marginHorizontal: -18, paddingVertical: 10, backgroundColor: DARK ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.45)', borderTopWidth: 1, borderTopColor: DARK ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)' },
  tick: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14 },
  tickDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.lime },
  tickName: { fontFamily: F.semibold, fontSize: 13, color: C.text, maxWidth: 180 },
  tickVal: { fontFamily: F.heavy, fontSize: 13, color: C.lime },
  tabText: { fontFamily: F.semibold, fontSize: 14, color: C.muted },
  tabTextOn: { fontFamily: F.bold, color: ON_ACCENT },
  list: { paddingHorizontal: 16, paddingBottom: 140, gap: 12 },
  vignette: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 150 },
  types: { flexDirection: 'row', gap: 16 },
  type: { minHeight: 44, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  typeOn: { borderBottomColor: C.accent },
  typeText: { fontFamily: F.semibold, fontSize: 14, color: C.muted },
  typeTextOn: { fontFamily: F.bold, color: C.text },
  banner: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: C.warnSoft, borderRadius: 12, padding: 12 },
  bannerText: { flex: 1, fontFamily: F.medium, fontSize: 13, color: C.warn },
  card: { ...GLASS, borderRadius: 20, padding: 16, paddingLeft: 20, overflow: 'hidden', shadowColor: '#0F172A', shadowOpacity: DARK ? 0 : 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 0 },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontFamily: F.bold, fontSize: 16, color: C.text },
  sme: { fontFamily: F.heavy, fontSize: 10, letterSpacing: 0.6, color: STATUS.listed.fg, backgroundColor: STATUS.listed.bg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  dates: { fontFamily: F.medium, fontSize: 13, color: C.muted },
  star: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  metrics: { flexDirection: 'row', gap: 8, marginTop: 14, backgroundColor: DARK ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)', borderRadius: 14, padding: 12 },
  mLabel: { fontFamily: F.medium, fontSize: 12, color: C.muted },
  mValue: { fontFamily: F.bold, fontSize: 15, color: C.text, marginTop: 2 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  footNote: { fontFamily: F.medium, fontSize: 12, color: C.muted },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontFamily: F.bold, fontSize: 16, color: C.text },
  emptyText: { fontFamily: F.regular, fontSize: 14, color: C.muted, textAlign: 'center' },
  footer: { fontFamily: F.regular, fontSize: 12, color: C.muted, textAlign: 'center' },
});
