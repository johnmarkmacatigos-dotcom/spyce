import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_ICONS: Record<string, string> = {
  feed: '🏠',
  challenges: '🏆',
  camera: '➕',
  marketplace: '🛍️',
  earnings: '💰',
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={[styles.tabIcon, name === 'camera' && styles.cameraTab]}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>
        {TAB_ICONS[name]}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#111',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: '#FF6B2B',
        tabBarInactiveTintColor: '#666',
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="feed" options={{ tabBarIcon: ({ focused }) => <TabIcon name="feed" focused={focused} /> }} />
      <Tabs.Screen name="challenges" options={{ tabBarIcon: ({ focused }) => <TabIcon name="challenges" focused={focused} /> }} />
      <Tabs.Screen name="camera" options={{ tabBarIcon: ({ focused }) => <TabIcon name="camera" focused={focused} /> }} />
      <Tabs.Screen name="marketplace" options={{ tabBarIcon: ({ focused }) => <TabIcon name="marketplace" focused={focused} /> }} />
      <Tabs.Screen name="earnings" options={{ tabBarIcon: ({ focused }) => <TabIcon name="earnings" focused={focused} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: { alignItems: 'center', justifyContent: 'center', width: 44, height: 44 },
  cameraTab: {
    backgroundColor: '#FF6B2B', borderRadius: 14, width: 50, height: 50,
  },
  tabEmoji: { fontSize: 24 },
  tabEmojiActive: { transform: [{ scale: 1.15 }] },
});
