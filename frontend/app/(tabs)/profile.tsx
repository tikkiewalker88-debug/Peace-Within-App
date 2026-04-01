import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Linking, Platform, RefreshControl
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
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        await AsyncStorage.multiRemove(['token', 'user']);
        router.replace('/');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        await AsyncStorage.setItem('user', JSON.stringify(data));
      }
    } catch (e) {}
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }, []);

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
        Alert.alert('Error', 'Could not start checkout. Please try again.');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please check your connection.');
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

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A6741" />}
    >
      <Text style={styles.title}>Profile</Text>

      {/* User Info */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
        </View>
        <Text style={styles.profileName}>{user?.name || 'User'}</Text>
        <Text style={styles.profileEmail}>{user?.email || ''}</Text>
        {memberSince ? <Text style={styles.memberSince}>Member since {memberSince}</Text> : null}
        <View style={[styles.badge, user?.is_premium && styles.premiumBadge]}>
          <Feather name={user?.is_premium ? 'award' : 'user'} size={14} color={user?.is_premium ? '#C18C5D' : '#4A6741'} />
          <Text style={[styles.badgeText, user?.is_premium && styles.premiumBadgeText]}>
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
          <View style={styles.premiumBanner}>
            <Feather name="star" size={22} color="#C18C5D" />
            <Text style={styles.premiumTitle}>Unlock Premium</Text>
          </View>
          <Text style={styles.premiumDesc}>
            Go deeper in your journey with unlimited access to your Peace Guide and exclusive wellness content.
          </Text>
          <View style={styles.premiumFeatures}>
            {[
              { icon: 'message-circle', text: 'Unlimited AI conversations' },
              { icon: 'book-open', text: 'Deeper spiritual guidance' },
              { icon: 'zap', text: 'Priority response times' },
              { icon: 'gift', text: 'Exclusive grounding exercises' },
            ].map((f, i) => (
              <View key={i} style={styles.premiumFeatureRow}>
                <Feather name={f.icon as any} size={16} color="#7C9A6F" />
                <Text style={styles.premiumFeatureText}>{f.text}</Text>
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
              <>
                <Text style={styles.subscribeBtnText}>Subscribe for $5.99/month</Text>
                <Text style={styles.subscribeBtnSub}>Cancel anytime</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Menu Items */}
      <View style={styles.menuSection}>
        {[
          { icon: 'bell', label: 'Notifications', subtitle: 'Daily check-in reminders' },
          { icon: 'shield', label: 'Privacy & Security', subtitle: 'Your data is encrypted' },
          { icon: 'help-circle', label: 'Help & Support', subtitle: 'FAQs and contact us' },
          { icon: 'info', label: 'About Peace Within', subtitle: 'Version 1.0.0' },
        ].map((item, i) => (
          <TouchableOpacity key={i} style={styles.menuItem} activeOpacity={0.7}>
            <View style={styles.menuIcon}>
              <Feather name={item.icon as any} size={18} color="#4A6741" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#C4C9C2" />
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
  title: { fontSize: 28, fontWeight: '700', color: '#2D332A', marginTop: 20, marginBottom: 24 },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: { boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.05)' },
      android: { elevation: 3 },
      web: { boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.05)' },
    }),
  },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#4A6741', justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    ...Platform.select({
      ios: { boxShadow: '0px 4px 12px rgba(74, 103, 65, 0.3)' },
      android: { elevation: 6 },
      web: { boxShadow: '0px 4px 12px rgba(74, 103, 65, 0.3)' },
    }),
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#FFFFFF' },
  profileName: { fontSize: 24, fontWeight: '700', color: '#2D332A', marginBottom: 4 },
  profileEmail: { fontSize: 14, color: '#5C6159', marginBottom: 4 },
  memberSince: { fontSize: 12, color: '#8F948B', marginBottom: 12 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E8EFE5', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
  },
  premiumBadge: { backgroundColor: '#C18C5D18' },
  badgeText: { fontSize: 13, fontWeight: '600', color: '#4A6741' },
  premiumBadgeText: { color: '#C18C5D' },
  statsRow: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16,
    ...Platform.select({
      ios: { boxShadow: '0px 1px 8px rgba(0, 0, 0, 0.04)' },
      android: { elevation: 2 },
      web: { boxShadow: '0px 1px 8px rgba(0, 0, 0, 0.04)' },
    }),
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#F2EBE3' },
  statValue: { fontSize: 24, fontWeight: '700', color: '#4A6741', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#5C6159', fontWeight: '500' },
  premiumCard: {
    backgroundColor: '#2E4228', borderRadius: 24, padding: 24, marginBottom: 20,
    ...Platform.select({
      ios: { boxShadow: '0px 6px 20px rgba(46, 66, 40, 0.3)' },
      android: { elevation: 8 },
      web: { boxShadow: '0px 6px 20px rgba(46, 66, 40, 0.3)' },
    }),
  },
  premiumBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  premiumTitle: { fontSize: 20, fontWeight: '700', color: '#F9F7F2' },
  premiumDesc: { fontSize: 14, color: '#B8C4B5', lineHeight: 22, marginBottom: 18 },
  premiumFeatures: { gap: 12, marginBottom: 22 },
  premiumFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  premiumFeatureText: { fontSize: 14, color: '#F9F7F2', fontWeight: '500' },
  subscribeBtn: {
    backgroundColor: '#C18C5D', paddingVertical: 18, borderRadius: 24, alignItems: 'center',
    ...Platform.select({
      ios: { boxShadow: '0px 4px 12px rgba(193, 140, 93, 0.4)' },
      android: { elevation: 6 },
      web: { boxShadow: '0px 4px 12px rgba(193, 140, 93, 0.4)' },
    }),
  },
  subscribeBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  subscribeBtnSub: { color: '#FFFFFF', fontSize: 12, opacity: 0.8, marginTop: 2 },
  menuSection: { gap: 6, marginBottom: 20 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    padding: 16, borderRadius: 16, marginBottom: 2,
  },
  menuIcon: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: '#E8EFE5', justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#2D332A' },
  menuSubtitle: { fontSize: 12, color: '#8F948B', marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 16, backgroundColor: '#D0535308',
    borderWidth: 1, borderColor: '#D0535320',
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#D05353' },
});
