import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { C, F } from '../../theme';

const icon = (name) => ({ color, size }) => <Feather name={name} color={color} size={size - 2} />;

// shadcn-style bottom bar: solid surface docked to the edge with a 1px top border.
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.text,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontFamily: F.semibold, fontSize: 11 },
        tabBarStyle: {
          // absolute so lists scroll to the bottom edge; screens already pad for the bar
          position: 'absolute', left: 0, right: 0, bottom: 0,
          height: 60 + insets.bottom, paddingTop: 6, paddingBottom: insets.bottom + 6,
          backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, elevation: 0,
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
