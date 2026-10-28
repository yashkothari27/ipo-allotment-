import { Appearance } from 'react-native';

// shortcut: theme is read once at launch (follows the phone setting); live switching needs a restart.
export const DARK = Appearance.getColorScheme() === 'dark';

// Minimalist clean palette inspired by ui-layouts design standards
// - Soft backgrounds with subtle contrast
// - Glass accents with refractive edges
// - Consistent color system across modes
const LIGHT_C = {
  bg: '#FAFAFA',          // off-white base
  card: '#FFFFFF',        // clean card surface
  text: '#111827',        // true black for readability
  muted: '#6B7280',       // medium gray
  faint: '#D1D5DB',       // light border/gray
  border: '#E5E7EB',      // input/border color
  ink: '#111827',         // primary text/ink
  accent: '#1F2937',      // dark slate for accents
  accentSoft: 'rgba(31,41,55,0.03)', // subtle overlay
  lime: '#059669',        // vibrant but subtle green
  danger: '#DC2626',      // red-600
  dangerSoft: '#FEE2E2',  // light red background
  warn: '#F59E0B',        // amber-500
  warnSoft: '#FFF7ED',    // light amber background
  chip: '#F3F4F6',        // subtle chip background
  star: '#FACC15',        // amber-100 for highlights
  up: '#10B981',          // green-500
};
const DARK_C = {
  bg: '#111827',          // nearly black base
  card: '#1E293B',        // dark card surface
  text: '#F8FAFC',        // light text
  muted: '#9CA3AF',       // muted gray
  faint: '#374151',       // form faint
  border: '#1F2937',      // dark border
  ink: '#F8FAFC',         // light ink on dark
  accent: '#F9FAFB',      // light accent
  accentSoft: 'rgba(249,250,251,0.08)', // subtle overlay
  lime: '#34D399',        // green-400
  danger: '#F87171',      // red-400
  dangerSoft: '#EF4444',  // red-500 in soft
  warn: '#FBBF24',        // amber-400
  warnSoft: '#FEF3C7',    // amber-100 soft
  chip: '#374151',        // dark chip
  star: '#FACC15',        // amber-100
  up: '#22C55E',          // green-400
};
export const C = DARK ? DARK_C : LIGHT_C;

// Liquid glass: translucent fill with refractive top edge
// Inspired by ui-layouts glassmorphism patterns - subtle, not overwhelming
export const GLASS = {
  backgroundColor: DARK ? 'rgba(17,24,39,0.55)' : 'rgba(250,250,250,0.75)',
  borderWidth: 1,
  borderColor: DARK ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
  borderTopColor: DARK ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)',
};

// Text color that adapts to accent fill
export const ON_ACCENT = DARK ? '#111827' : '#FFFFFF';

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