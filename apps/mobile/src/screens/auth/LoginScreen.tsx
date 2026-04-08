import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Alert, Dimensions, Animated,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { authenticateWithPi, initializePiSDK } from '../../services/piAuth';

const { height } = Dimensions.get('window');

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const { setUser, setJwt } = useAuthStore();

  useEffect(() => {
    initializePiSDK();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePiLogin = async () => {
    setLoading(true);
    try {
      const { jwt, user } = await authenticateWithPi();
      setJwt(jwt);
      setUser(user);
      router.replace('/(tabs)/feed');
    } catch (err: any) {
      Alert.alert(
        'Login Failed',
        err.message?.includes('Pi Browser')
          ? 'Please open SPYCE inside the Pi Browser app to login.'
          : 'Could not authenticate. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0A0A0A', '#1A0A00', '#0A0A0A']} style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.logoRow}>
          <Text style={styles.logoEmoji}>🌶</Text>
          <Text style={styles.logoText}>SPYCE</Text>
        </View>
        <Text style={styles.tagline}>
          Earn Pi. Create Content.{'\n'}Live Your Best Life.
        </Text>
        <View style={styles.features}>
          {[
            { icon: '🎬', label: 'Short videos that earn Pi' },
            { icon: '🏆', label: 'Daily Pi challenges and streaks' },
            { icon: '🛍️', label: 'Pi-powered marketplace' },
            { icon: '💰', label: 'Creator fund and referral earnings' },
          ].map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.piButton} onPress={handlePiLogin} disabled={loading} activeOpacity={0.85}>
          <LinearGradient colors={['#FF6B2B', '#E84040']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.piButtonGradient}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.piButtonIcon}>π</Text>
                <Text style={styles.piButtonText}>Continue with Pi Network</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>
          By continuing you agree to SPYCE's Terms of Service and Privacy Policy.
          {'\n'}Pi payments require the Pi Browser app.
        </Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 28, paddingBottom: 48 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  logoEmoji: { fontSize: 40, marginRight: 10 },
  logoText: { fontSize: 48, fontWeight: '900', color: '#FF6B2B', letterSpacing: 4 },
  tagline: { fontSize: 22, color: '#FFFFFFCC', fontWeight: '600', lineHeight: 32, marginBottom: 32 },
  features: { marginBottom: 40 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  featureIcon: { fontSize: 22, marginRight: 14, width: 30 },
  featureLabel: { fontSize: 16, color: '#FFFFFF99' },
  piButton: { borderRadius: 16, overflow: 'hidden', marginBottom: 20, elevation: 8 },
  piButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, paddingHorizontal: 24, gap: 10 },
  piButtonIcon: { fontSize: 24, color: '#fff', fontWeight: '900' },
  piButtonText: { fontSize: 18, color: '#fff', fontWeight: '700' },
  disclaimer: { fontSize: 11, color: '#FFFFFF44', textAlign: 'center', lineHeight: 16 },
});
