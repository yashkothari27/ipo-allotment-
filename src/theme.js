import { Appearance } from 'react-native';

// shortcut: theme is read once at launch (follows the phone setting); live switching needs a restart.
export const DARK = Appearance.getColorScheme() === 'dark';

// shadcn/ui "zinc" palette: neutral surfaces, 1px borders, near-black primary.
const LIGHT_C = {
  bg: '#FFFFFF',          // background
  card: '#FFFFFF',        // card
  text: '#09090B',        // foreground (zinc-950)
  muted: '#71717A',       // muted-foreground (zinc-500)
  faint: '#A1A1AA',       // zinc-400, decorative only
  border: '#E4E4E7',      // border / input (zinc-200)
  ink: '#18181B',
  accent: '#18181B',      // primary (zinc-900)
  accentSoft: '#F4F4F5',  // secondary / muted (zinc-100)
  lime: '#16A34A',        // positive numbers
  danger: '#DC2626',      // destructive
  dangerSoft: '#FEF2F2',
  warn: '#B45309',
  warnSoft: '#FFFBEB',
  chip: '#F4F4F5',        // muted (zinc-100)
  star: '#EAB308',
  up: '#16A34A',
};
const DARK_C = {
  bg: '#09090B',
  card: '#09090B',
  text: '#FAFAFA',
  muted: '#A1A1AA',
  faint: '#52525B',
  border: '#27272A',      // zinc-800
  ink: '#FAFAFA',
  accent: '#FAFAFA',      // primary in dark
  accentSoft: '#27272A',
  lime: '#4ADE80',
  danger: '#F87171',
  dangerSoft: '#2A1215',
  warn: '#FBBF24',
  warnSoft: '#2A1F0A',
  chip: '#27272A',
  star: '#FACC15',
  up: '#4ADE80',
};
export const C = DARK ? DARK_C : LIGHT_C;

// Card surface (name kept so screens don't change): solid card, 1px border, no translucency.
export const GLASS = {
  backgroundColor: C.card,
  borderWidth: 1,
  borderColor: C.border,
};

// Text color that adapts to accent fill
export const ON_ACCENT = DARK ? '#18181B' : '#FAFAFA';

// Type scale - Manrope variable weights
export const F = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  heavy: 'Manrope_800ExtraBold',
};

export const NUM = { fontVariant: ['tabular-nums'] };

// Status chips - minimal labels with subtle backgrounds
export const STATUS = DARK ? {
  open: { label: 'Open', fg: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  upcoming: { label: 'Upcoming', fg: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  closed: { label: 'Closed', fg: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  listed: { label: 'Listed', fg: '#FACC15', bg: 'rgba(250,204,21,0.12)' },
} : {
  open: { label: 'Open', fg: '#059669', bg: 'rgba(5,150,105,0.12)' },
  upcoming: { label: 'Upcoming', fg: '#2563EB', bg: 'rgba(37,99,235,0.12)' },
  closed: { label: 'Closed', fg: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  listed: { label: 'Listed', fg: '#FACC15', bg: 'rgba(250,204,21,0.12)' },
};

// Avatar hash-based colors - refined palette
const HUES = [
  ['#FFE4D6', '#DC2626'], ['#DCFCE7', '#10B981'], ['#E0F2FE', '#3B82F6'],
  ['#FEF3C7', '#F59E0B'], ['#FCE7F3', '#EC4899'], ['#CCFBF1', '#06B6D4'], ['#FEE2E2', '#EF4444'],
];
const HUES_DARK = [
  ['#3A1D10', '#F87171'], ['#0F2F1C', '#22C55E'], ['#0C2A3D', '#3B82F6'],
  ['#33260A', '#F59E0B'], ['#3A1229', '#EC4899'], ['#0B302C', '#22C55E'], ['#3A1414', '#F87171'],
];
export const hue = (str = '') => (DARK ? HUES_DARK : HUES)[[...str].reduce((a, ch) => a + ch.charCodeAt(0), 0) % HUES.length];