import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { C, DARK, F } from '../../theme';

const icon = (name) => ({ color, size }) => <Feather name={name} color={color} size={size - 2} />;

// Liquid-glass tab bar: floating pill, frosted, with a bright refraction edge on top.
function Glass() {
  return (
    <View style={[StyleSheet.absoluteFill, s.glass]}>
      <BlurView intensity={60} tint={DARK ? 'systemThinMaterialDark' : 'systemThinMaterialLight'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: DARK ? 'rgba(20,28,46,0.72)' : 'rgba(255,255,255,0.78)' }]} />
      <View style={s.edge} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontFamily: F.bold, fontSize: 11 },
        tabBarBackground: () => <Glass />,
        tabBarStyle: {
          position: 'absolute', left: 0, right: 0, marginHorizontal: 16, bottom: insets.bottom + 10,
          height: 66, paddingBottom: 8, paddingTop: 8, borderRadius: 26, borderTopWidth: 0,
          backgroundColor: 'transparent', elevation: 0,
          shadowColor: '#0F172A', shadowOpacity: DARK ? 0.5 : 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 10 },
        },
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'IPOs', tabBarIcon: icon('trending-up') }} />
      <Tabs.Screen name="pans" options={{ title: 'PANs', tabBarIcon: icon('users') }} />
      <Tabs.Screen name="allotment" options={{ title: 'Allotment', tabBarIcon: icon('check-circle') }} />
    </Tabs>
  );
}

const s = StyleSheet.create({
  glass: { borderRadius: 26, overflow: 'hidden', borderWidth: 1, borderColor: DARK ? 'rgba(255,255,255,0.10)' : 'rgba(11,59,46,0.08)' },
  edge: { position: 'absolute', top: 0, left: 18, right: 18, height: 1, backgroundColor: DARK ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,1)' },
});
