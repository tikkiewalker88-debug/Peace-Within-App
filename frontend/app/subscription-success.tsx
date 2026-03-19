import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function SubscriptionSuccessScreen() {
  const { session_id } = useLocalSearchParams<{ session_id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (session_id) {
      pollStatus(session_id, 0);
    }
  }, [session_id]);

  const pollStatus = async (sid: string, attempt: number) => {
    if (attempt >= 5) {
      setStatus('error');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/subscription/status/${sid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.payment_status === 'paid') {
          setStatus('success');
          // Update local user data
          const userData = await AsyncStorage.getItem('user');
          if (userData) {
            const user = JSON.parse(userData);
            user.is_premium = true;
            await AsyncStorage.setItem('user', JSON.stringify(user));
          }
          return;
        }
      }
    } catch (e) {}
    setTimeout(() => pollStatus(sid, attempt + 1), 2000);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {status === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4A6741" />
          <Text style={styles.loadingText}>Verifying payment...</Text>
        </View>
      )}
      {status === 'success' && (
        <View style={styles.center}>
          <View style={styles.successIcon}>
            <Feather name="check" size={48} color="#4A6741" />
          </View>
          <Text style={styles.successTitle}>Welcome to Premium!</Text>
          <Text style={styles.successText}>
            You now have unlimited AI chats and deeper spiritual guidance.
          </Text>
          <TouchableOpacity
            testID="sub-success-home-btn"
            style={styles.homeBtn}
            onPress={() => router.replace('/(tabs)/home')}
          >
            <Text style={styles.homeBtnText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      )}
      {status === 'error' && (
        <View style={styles.center}>
          <View style={styles.errorIcon}>
            <Feather name="alert-circle" size={48} color="#D05353" />
          </View>
          <Text style={styles.errorTitle}>Payment Pending</Text>
          <Text style={styles.errorText}>
            We couldn't verify your payment yet. It may take a moment to process.
          </Text>
          <TouchableOpacity
            testID="sub-error-back-btn"
            style={styles.homeBtn}
            onPress={() => router.replace('/(tabs)/profile')}
          >
            <Text style={styles.homeBtnText}>Back to Profile</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7F2' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  loadingText: { fontSize: 16, color: '#5C6159', marginTop: 16 },
  successIcon: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#E8EFE5', justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  successTitle: { fontSize: 26, fontWeight: '700', color: '#2D332A', marginBottom: 12, textAlign: 'center' },
  successText: { fontSize: 16, color: '#5C6159', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  errorIcon: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#D0535320', justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  errorTitle: { fontSize: 26, fontWeight: '700', color: '#2D332A', marginBottom: 12 },
  errorText: { fontSize: 16, color: '#5C6159', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  homeBtn: {
    backgroundColor: '#4A6741', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 28, alignItems: 'center',
  },
  homeBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
