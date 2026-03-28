import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

const TABS = [
  { name: 'Feed', icon: '🏠', label: 'Home' },
  { name: 'Challenges', icon: '🏆', label: 'Earn' },
  { name: 'Upload', icon: '➕', label: 'Create' },
  { name: 'Marketplace', icon: '🛒', label: 'Shop' },
  { name: 'Profile', icon: '👤', label: 'Me' },
];

export function BottomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <BlurView intensity={80} tint="dark" style={[styles.container, { paddingBottom: insets.bottom }]}>
      {TABS.map((tab, index) => {
        const focused = state.index === index;
        const isCenterTab = index === 2;

        return (
          <TouchableOpacity
            key={tab.name}
            style={[styles.tab, isCenterTab && styles.centerTab]}
            onPress={() => navigation.navigate(tab.name)}
            activeOpacity={0.7}
          >
            {isCenterTab ? (
              <View style={styles.createBtn}>
                <Text style={styles.createIcon}>{tab.icon}</Text>
              </View>
            ) : (
              <>
                <Text style={[styles.icon, focused && styles.iconActive]}>{tab.icon}</Text>
                <Text style={[styles.label, focused && styles.labelActive]}>{tab.label}</Text>
              </>
            )}
          </TouchableOpacity>
        );
      })}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.1)' },
  tab: { flex: 1, alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  centerTab: { justifyContent: 'center', alignItems: 'center', paddingTop: 6 },
  createBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FF6B2B', justifyContent: 'center', alignItems: 'center', shadowColor: '#FF6B2B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 8 },
  createIcon: { fontSize: 28 },
  icon: { fontSize: 24, opacity: 0.5 },
  iconActive: { opacity: 1 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 },
  labelActive: { color: '#FF6B2B', fontWeight: '600' },
});