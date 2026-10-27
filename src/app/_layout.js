import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ShareIntentProvider } from 'expo-share-intent';
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { C, DARK, F } from '../theme';

export default function RootLayout() {
  const [loaded] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  if (!loaded) return null; // splash stays up until fonts are ready

  return (
    <ShareIntentProvider>
      <StatusBar style={DARK ? 'light' : 'dark'} />
      <Stack screenOptions={{
        headerTintColor: C.text,
        headerStyle: { backgroundColor: C.bg },
        headerTitleStyle: { fontFamily: F.bold, fontSize: 17 },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: C.bg },
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ipo/[id]" options={{ title: '' }} />
      </Stack>
    </ShareIntentProvider>
  );
}
