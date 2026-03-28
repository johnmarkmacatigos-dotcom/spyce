import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';

interface Props { amount: number; type: string; onHide?: () => void; }

export function PiEarnToast({ amount, type, onHide }: Props) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 15 });
    opacity.value = withTiming(1, { duration: 300 });
    const t = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 400 });
      translateY.value = withTiming(-100, { duration: 400 }, (done) => {
        if (done && onHide) runOnJS(onHide)();
      });
    }, 2500);
    return () => clearTimeout(t);
  }, []);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }], opacity: opacity.value }));
  const pi = (amount / 1_000_000).toFixed(4);
  const label = { reaction: 'Reaction', challenge: 'Challenge', watch: 'Watch Reward', referral: 'Referral' }[type] ?? 'Reward';

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <Text style={styles.icon}>🌶</Text>
      <View>
        <Text style={styles.amount}>+{pi} π</Text>
        <Text style={styles.label}>{label} earned!</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 60, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,107,43,0.95)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, gap: 10, shadowColor: '#FF6B2B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 10, zIndex: 999 },
  icon: { fontSize: 24 },
  amount: { color: '#fff', fontSize: 18, fontWeight: '800' },
  label: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
});