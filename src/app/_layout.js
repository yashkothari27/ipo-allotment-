import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ShareIntentProvider } from 'expo-share-intent';
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { C, DARK, F } from '../theme';
import { LockGate } from '../lock';
import { Backdrop } from '../components';

export default function RootLayout() {
  const insets = useSafeAreaInsets();
  const [loaded] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  if (!loaded) return null; // splash stays up until fonts are ready

  return (
    <ShareIntentProvider>
      <StatusBar style={DARK ? 'light' : 'dark'} />
      <LockGate>
      <Backdrop />
      <Stack screenOptions={{
        headerTintColor: C.text,
        headerStyle: { backgroundColor: 'transparent' },
        headerTitleStyle: { fontFamily: F.bold, fontSize: 17 },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: 'transparent' },
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ipo/[id]" options={{ title: '' }} />
      </Stack>
      <LinearGradient pointerEvents="none" colors={DARK ? ['rgba(11,18,32,0.95)', 'rgba(11,18,32,0)'] : ['rgba(238,244,251,0.96)', 'rgba(238,244,251,0)']}
        style={[StyleSheet.absoluteFill, { bottom: undefined, height: insets.top + 14 }]} />
      </LockGate>
    </ShareIntentProvider>
  );
}
