import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../store/auth.store';

export function LoginScreen() {
  const { login, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    try {
      await login();
    } catch (e: any) {
      setError(e.message ?? 'Login failed. Make sure you are using Pi Browser.');
    }
  };

  return (
    <LinearGradient colors={['#0A0A0A', '#1A0A00', '#0A0A0A']} style={styles.container}>
      <SafeAreaView style={styles.inner}>
        <View style={styles.hero}>
          <Text style={styles.logo}>🌶</Text>
          <Text style={styles.appName}>SPYCE</Text>
          <Text style={styles.tagline}>Short videos. Daily challenges.{'
'}Earn real Pi.</Text>
        </View>

        <View style={styles.features}>
          {[
            { icon: '🎬', text: 'Create & watch viral short videos' },
            { icon: '🏆', text: 'Complete daily challenges for Pi' },
            { icon: '🛒', text: 'Buy & sell in the Spyce Shop' },
            { icon: '💰', text: 'Earn Pi from likes, views & referrals' },
          ].map(f => (
            <View key={f.text} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={isLoading} activeOpacity={0.85}>
          <LinearGradient colors={['#FF6B2B', '#E84040']} style={styles.loginGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.piLogo}>π</Text>
                <Text style={styles.loginText}>Continue with Pi Network</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.piNote}>Requires Pi Browser app to authenticate</Text>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 32, justifyContent: 'center', gap: 32 },
  hero: { alignItems: 'center', gap: 8 },
  logo: { fontSize: 72 },
  appName: { color: '#fff', fontSize: 48, fontWeight: '900', letterSpacing: 4 },
  tagline: { color: 'rgba(255,255,255,0.6)', fontSize: 16, textAlign: 'center', lineHeight: 24 },
  features: { gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.04)', padding: 14, borderRadius: 14 },
  featureIcon: { fontSize: 28 },
  featureText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, flex: 1 },
  errorBox: { backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  errorText: { color: '#F87171', fontSize: 13, textAlign: 'center' },
  loginBtn: { borderRadius: 30, overflow: 'hidden' },
  loginGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  piLogo: { color: '#fff', fontSize: 24, fontWeight: '800' },
  loginText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  piNote: { color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center' },
});