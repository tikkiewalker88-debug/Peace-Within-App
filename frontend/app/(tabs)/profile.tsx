import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Linking
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        await AsyncStorage.setItem('user', JSON.stringify(data));
      }
    } catch (e) {}
    setLoading(false);
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const originUrl = API_URL;
      const res = await fetch(`${API_URL}/api/subscription/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ origin_url: originUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          await Linking.openURL(data.url);
        }
      } else {
        Alert.alert('Error', 'Could not start checkout');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setSubscribing(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['token', 'user']);
          router.replace('/');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#4A6741" />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>

      {/* User Info */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
        </View>
        <Text style={styles.profileName}>{user?.name || 'User'}</Text>
        <Text style={styles.profileEmail}>{user?.email || ''}</Text>
        <View style={styles.badge}>
          <Feather name={user?.is_premium ? 'award' : 'user'} size={14} color={user?.is_premium ? '#C18C5D' : '#4A6741'} />
          <Text style={[styles.badgeText, user?.is_premium && styles.premiumText]}>
            {user?.is_premium ? 'Premium Member' : 'Free Plan'}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user?.total_checkins || 0}</Text>
          <Text style={styles.statLabel}>Check-ins</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user?.is_premium ? '∞' : '5/day'}</Text>
          <Text style={styles.statLabel}>AI Chats</Text>
        </View>
      </View>

      {/* Premium Section */}
      {!user?.is_premium && (
        <View style={styles.premiumCard}>
          <View style={styles.premiumHeader}>
            <Feather name="star" size={20} color="#C18C5D" />
            <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
          </View>
          <Text style={styles.premiumDesc}>
            Unlock unlimited AI conversations, deeper spiritual guidance, and exclusive content.
          </Text>
          <View style={styles.premiumFeatures}>
            {['Unlimited AI chats', 'Deeper spiritual guidance', 'Priority responses'].map((f, i) => (
              <View key={i} style={styles.premiumFeatureRow}>
                <Feather name="check-circle" size={16} color="#4A6741" />
                <Text style={styles.premiumFeatureText}>{f}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            testID="subscribe-btn"
            style={styles.subscribeBtn}
            onPress={handleSubscribe}
            disabled={subscribing}
            activeOpacity={0.8}
          >
            {subscribing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.subscribeBtnText}>Subscribe · $5.99/month</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Menu Items */}
      <View style={styles.menuSection}>
        {[
          { icon: 'bell', label: 'Notifications', subtitle: 'Daily reminders' },
          { icon: 'shield', label: 'Privacy', subtitle: 'Your data is safe' },
          { icon: 'info', label: 'About', subtitle: 'Peace Within v1.0' },
        ].map((item, i) => (
          <TouchableOpacity key={i} style={styles.menuItem} activeOpacity={0.7}>
            <View style={styles.menuIcon}>
              <Feather name={item.icon as any} size={18} color="#4A6741" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#8F948B" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity testID="logout-btn" style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Feather name="log-out" size={18} color="#D05353" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7F2' },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: '700', color: '#2D332A', marginTop: 20, marginBottom: 24 },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#4A6741', justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  profileName: { fontSize: 22, fontWeight: '700', color: '#2D332A', marginBottom: 4 },
  profileEmail: { fontSize: 14, color: '#5C6159', marginBottom: 12 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E8EFE5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  badgeText: { fontSize: 13, fontWeight: '600', color: '#4A6741' },
  premiumText: { color: '#C18C5D' },
  statsRow: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#F2EBE3' },
  statValue: { fontSize: 22, fontWeight: '700', color: '#4A6741', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#5C6159' },
  premiumCard: {
    backgroundColor: '#2E4228', borderRadius: 24, padding: 24, marginBottom: 20,
  },
  premiumHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  premiumTitle: { fontSize: 18, fontWeight: '700', color: '#F9F7F2' },
  premiumDesc: { fontSize: 14, color: '#B8C4B5', lineHeight: 20, marginBottom: 16 },
  premiumFeatures: { gap: 10, marginBottom: 20 },
  premiumFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  premiumFeatureText: { fontSize: 14, color: '#F9F7F2' },
  subscribeBtn: {
    backgroundColor: '#C18C5D', paddingVertical: 16, borderRadius: 24, alignItems: 'center',
  },
  subscribeBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  menuSection: { gap: 4, marginBottom: 20 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    padding: 16, borderRadius: 16, marginBottom: 8,
  },
  menuIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#E8EFE5', justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#2D332A' },
  menuSubtitle: { fontSize: 12, color: '#8F948B', marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: '#D0535330',
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#D05353' },
});
