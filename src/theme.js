import { Appearance } from 'react-native';

// shortcut: theme is read once at launch (follows the phone setting); live switching needs a restart.
export const DARK = Appearance.getColorScheme() === 'dark';

const LIGHT_C = {
  bg: '#F3F5F9', card: '#FFFFFF', text: '#0F172A', muted: '#475569', faint: '#94A3B8', border: '#E2E8F0',
  ink: '#0B3B2E', accent: '#047857', accentSoft: '#E3F6EC', lime: '#B8F36B',
  danger: '#C2410C', dangerSoft: '#FFF1EA', warn: '#B45309', warnSoft: '#FEF3C7', chip: '#E9EDF3', star: '#F59E0B',
};
const DARK_C = {
  bg: '#0B1220', card: '#141C2E', text: '#F1F5F9', muted: '#A5B1C4', faint: '#55627A', border: '#24304A',
  ink: '#0E4434', accent: '#34D399', accentSoft: '#0F2F27', lime: '#C4F57F',
  danger: '#FB923C', dangerSoft: '#3A1D10', warn: '#FBBF24', warnSoft: '#33260A', chip: '#1E2840', star: '#FBBF24',
};
export const C = DARK ? DARK_C : LIGHT_C;
// Text/icons placed on C.accent fills.
export const ON_ACCENT = DARK ? '#06261C' : '#FFFFFF';

// Android needs the weight baked into the family name, so never pair these with fontWeight.
export const F = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  heavy: 'Manrope_800ExtraBold',
};

export const NUM = { fontVariant: ['tabular-nums'] };

export const STATUS = DARK ? {
  open: { label: 'Open', fg: '#34D399', bg: '#0F2F27' },
  upcoming: { label: 'Upcoming', fg: '#38BDF8', bg: '#0C2A3D' },
  closed: { label: 'Closed', fg: '#FBBF24', bg: '#33260A' },
  listed: { label: 'Listed', fg: '#F472B6', bg: '#3A1229' },
} : {
  open: { label: 'Open', fg: '#047857', bg: '#DCFCE7' },
  upcoming: { label: 'Upcoming', fg: '#0369A1', bg: '#E0F2FE' },
  closed: { label: 'Closed', fg: '#B45309', bg: '#FEF3C7' },
  listed: { label: 'Listed', fg: '#BE185D', bg: '#FCE7F3' },
};

// Avatar colours picked by name hash so a company / person always gets the same tile.
const HUES = [
  ['#FFE4D6', '#C2410C'], ['#DCFCE7', '#15803D'], ['#E0F2FE', '#0369A1'],
  ['#FEF3C7', '#B45309'], ['#FCE7F3', '#BE185D'], ['#CCFBF1', '#0F766E'], ['#FEE2E2', '#B91C1C'],
];
const HUES_DARK = [
  ['#3A1D10', '#FB923C'], ['#0F2F1C', '#4ADE80'], ['#0C2A3D', '#38BDF8'],
  ['#33260A', '#FBBF24'], ['#3A1229', '#F472B6'], ['#0B302C', '#2DD4BF'], ['#3A1414', '#F87171'],
];
export const hue = (str = '') => (DARK ? HUES_DARK : HUES)[[...str].reduce((a, ch) => a + ch.charCodeAt(0), 0) % HUES.length];
