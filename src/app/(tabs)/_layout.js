import { Tabs } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { C, DARK, F } from '../../theme';

const icon = (name) => ({ color, size }) => <Feather name={name} color={color} size={size - 2} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontFamily: F.bold, fontSize: 12 },
        tabBarStyle: { backgroundColor: C.card, borderTopColor: DARK ? C.border : 'transparent', elevation: 12, shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 16 },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'IPOs', tabBarIcon: icon('trending-up') }} />
      <Tabs.Screen name="pans" options={{ title: 'PANs', tabBarIcon: icon('users') }} />
      <Tabs.Screen name="allotment" options={{ title: 'Allotment', tabBarIcon: icon('check-circle') }} />
    </Tabs>
  );
}
