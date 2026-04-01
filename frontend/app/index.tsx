import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        router.replace('/(tabs)/home');
        return;
      }
    } catch (e) {}
    setChecking(false);
  };

  if (checking) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#4A6741" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 60), paddingBottom: Math.max(insets.bottom, 32) }]}>
      <View style={styles.topSection}>
        <View style={styles.iconCircle}>
          <Feather name="sun" size={48} color="#4A6741" />
        </View>
        <Text style={styles.title}>Peace Within</Text>
        <Text style={styles.subtitle}>Find your calm. Nurture your soul.</Text>
      </View>

      <View style={styles.featureList}>
        {[
          { icon: 'heart', text: 'Daily affirmations tailored to you', desc: 'Personalized spiritual encouragement' },
          { icon: 'message-circle', text: 'AI-guided wellness conversations', desc: 'Advice on relationships & growth' },
          { icon: 'trending-up', text: 'Track your emotional growth', desc: 'Visualize your journey to peace' },
        ].map((item, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Feather name={item.icon as any} size={20} color="#4A6741" />
            </View>
            <View style={styles.featureTextWrap}>
              <Text style={styles.featureText}>{item.text}</Text>
              <Text style={styles.featureDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity
          testID="get-started-btn"
          style={styles.primaryBtn}
          onPress={() => router.push('/(auth)/signup')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryBtnText}>Get Started</Text>
          <Feather name="arrow-right" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          testID="login-btn"
          style={styles.secondaryBtn}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>Already have an account? <Text style={styles.secondaryBold}>Log in</Text></Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F7F2',
    paddingHorizontal: 24,
  },
  center: { justifyContent: 'center', alignItems: 'center' },
  topSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8EFE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: { boxShadow: '0px 4px 16px rgba(74, 103, 65, 0.12)' },
      android: { elevation: 4 },
      web: { boxShadow: '0px 4px 16px rgba(74, 103, 65, 0.12)' },
    }),
  },
  title: {
    fontSize: 38,
    fontWeight: '700',
    color: '#2D332A',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: '#5C6159',
    letterSpacing: 0.3,
  },
  featureList: {
    flex: 1,
    justifyContent: 'center',
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 20,
    ...Platform.select({
      ios: { boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.04)' },
      android: { elevation: 2 },
      web: { boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.04)' },
    }),
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E8EFE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureTextWrap: { flex: 1 },
  featureText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D332A',
    marginBottom: 3,
  },
  featureDesc: {
    fontSize: 13,
    color: '#8F948B',
  },
  bottomSection: {
    gap: 12,
    paddingTop: 20,
  },
  primaryBtn: {
    backgroundColor: '#4A6741',
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      ios: { boxShadow: '0px 4px 12px rgba(74, 103, 65, 0.25)' },
      android: { elevation: 6 },
      web: { boxShadow: '0px 4px 12px rgba(74, 103, 65, 0.25)' },
    }),
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#5C6159',
    fontSize: 15,
  },
  secondaryBold: {
    color: '#4A6741',
    fontWeight: '700',
  },
});
