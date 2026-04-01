import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Platform, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const MOODS = [
  { key: 'happy', emoji: '😊', label: 'Happy', color: '#F2CC8F' },
  { key: 'calm', emoji: '😌', label: 'Calm', color: '#81B29A' },
  { key: 'grateful', emoji: '🙏', label: 'Grateful', color: '#7C9A6F' },
  { key: 'stressed', emoji: '😰', label: 'Stressed', color: '#E07A5F' },
  { key: 'sad', emoji: '😢', label: 'Sad', color: '#7E9CB6' },
  { key: 'angry', emoji: '😤', label: 'Angry', color: '#D05353' },
  { key: 'anxious', emoji: '😟', label: 'Anxious', color: '#C18C5D' },
  { key: 'tired', emoji: '😴', label: 'Tired', color: '#A8A29E' },
];

const handleAuthError = async (res: Response, router: any) => {
  if (res.status === 401) {
    await AsyncStorage.multiRemove(['token', 'user']);
    router.replace('/');
    return true;
  }
  return false;
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [affirmation, setAffirmation] = useState('');
  const [loadingAffirmation, setLoadingAffirmation] = useState(true);
  const [loadingMood, setLoadingMood] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [recentMoods, setRecentMoods] = useState<any[]>([]);

  const getToken = async () => await AsyncStorage.getItem('token');

  const loadUser = async () => {
    const userData = await AsyncStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
  };

  const loadAffirmation = async () => {
    setLoadingAffirmation(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/affirmation`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (await handleAuthError(res, router)) return;
      if (res.ok) {
        const data = await res.json();
        setAffirmation(data.affirmation);
      }
    } catch (e) {
      setAffirmation('Every breath is a fresh beginning. You are worthy of peace and love.');
    } finally {
      setLoadingAffirmation(false);
    }
  };

  const loadRecentMoods = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/checkins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecentMoods(data.slice(0, 3));
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadUser();
    loadAffirmation();
    loadRecentMoods();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadUser(), loadAffirmation(), loadRecentMoods()]);
    setRefreshing(false);
  }, []);

  const handleMoodSelect = async (mood: string) => {
    setLoadingMood(mood);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mood }),
      });
      if (await handleAuthError(res, router)) return;
      if (res.ok) {
        const data = await res.json();
        router.push({
          pathname: '/mood-result',
          params: {
            mood: data.mood,
            motivational: data.motivational_message,
            scripture: data.scripture,
            exercise: data.grounding_exercise,
          },
        });
        loadRecentMoods();
      } else {
        Alert.alert('Error', 'Could not complete check-in. Please try again.');
      }
    } catch (e) {
      Alert.alert('Connection Error', 'Please check your internet connection.');
    } finally {
      setLoadingMood(null);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getMoodInfo = (key: string) => MOODS.find(m => m.key === key);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A6741" />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{user?.name || 'Friend'}</Text>
          <Text style={styles.dateText}>{today}</Text>
        </View>
        <View style={styles.headerIcon}>
          <Feather name="sun" size={24} color="#4A6741" />
        </View>
      </View>

      {/* Daily Affirmation */}
      <View testID="affirmation-card" style={styles.affirmationCard}>
        <View style={styles.affirmationHeader}>
          <Feather name="star" size={16} color="#C18C5D" />
          <Text style={styles.affirmationLabel}>TODAY'S AFFIRMATION</Text>
        </View>
        {loadingAffirmation ? (
          <View style={styles.affirmationLoading}>
            <ActivityIndicator color="#7C9A6F" />
            <Text style={styles.affirmationLoadingText}>Crafting your affirmation...</Text>
          </View>
        ) : (
          <Text style={styles.affirmationText}>"{affirmation}"</Text>
        )}
      </View>

      {/* Mood Check-in */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How are you feeling?</Text>
        <Text style={styles.sectionSubtitle}>Tap to check in and receive personalized guidance</Text>
        <View style={styles.moodGrid}>
          {MOODS.map((mood) => (
            <TouchableOpacity
              testID={`mood-${mood.key}`}
              key={mood.key}
              style={[styles.moodItem, loadingMood === mood.key && { backgroundColor: mood.color + '30' }]}
              onPress={() => handleMoodSelect(mood.key)}
              disabled={loadingMood !== null}
              activeOpacity={0.7}
            >
              {loadingMood === mood.key ? (
                <ActivityIndicator color={mood.color} />
              ) : (
                <>
                  <View style={[styles.moodEmojiWrap, { backgroundColor: mood.color + '20' }]}>
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  </View>
                  <Text style={styles.moodLabel}>{mood.label}</Text>
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Check-ins */}
      {recentMoods.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Check-ins</Text>
            <TouchableOpacity testID="view-all-checkins" onPress={() => router.push('/(tabs)/progress')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentMoods.map((checkin, i) => {
            const moodInfo = getMoodInfo(checkin.mood);
            return (
              <View key={i} style={styles.recentItem}>
                <View style={[styles.recentDot, { backgroundColor: moodInfo?.color || '#8F948B' }]} />
                <View style={styles.recentContent}>
                  <Text style={styles.recentMood}>{moodInfo?.label || checkin.mood}</Text>
                  <Text style={styles.recentDate}>
                    {new Date(checkin.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text style={styles.recentEmoji}>{moodInfo?.emoji}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Quick Action */}
      <TouchableOpacity
        testID="quick-chat-btn"
        style={styles.quickChatCard}
        onPress={() => router.push('/(tabs)/chat')}
        activeOpacity={0.8}
      >
        <View style={styles.quickChatIcon}>
          <Feather name="message-circle" size={22} color="#4A6741" />
        </View>
        <View style={styles.quickChatText}>
          <Text style={styles.quickChatTitle}>Need someone to talk to?</Text>
          <Text style={styles.quickChatDesc}>Chat with your Peace Guide</Text>
        </View>
        <Feather name="chevron-right" size={20} color="#8F948B" />
      </TouchableOpacity>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7F2' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 20,
  },
  greeting: { fontSize: 15, color: '#5C6159', marginBottom: 2 },
  userName: { fontSize: 28, fontWeight: '700', color: '#2D332A' },
  dateText: { fontSize: 13, color: '#8F948B', marginTop: 4 },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8EFE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  affirmationCard: {
    backgroundColor: '#2E4228',
    borderRadius: 24,
    padding: 24,
    marginBottom: 28,
    ...Platform.select({
      ios: { boxShadow: '0px 8px 24px rgba(46, 66, 40, 0.3)' },
      android: { elevation: 8 },
      web: { boxShadow: '0px 8px 24px rgba(46, 66, 40, 0.3)' },
    }),
  },
  affirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  affirmationLabel: { fontSize: 12, color: '#C18C5D', fontWeight: '700', letterSpacing: 1.5 },
  affirmationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  affirmationLoadingText: { fontSize: 14, color: '#B8C4B5', fontStyle: 'italic' },
  affirmationText: { fontSize: 20, color: '#F9F7F2', lineHeight: 32, fontWeight: '500', fontStyle: 'italic' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#2D332A', marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, color: '#5C6159', marginBottom: 16 },
  viewAllText: { fontSize: 14, color: '#4A6741', fontWeight: '600' },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moodItem: {
    width: '22%',
    aspectRatio: 0.9,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    ...Platform.select({
      ios: { boxShadow: '0px 1px 8px rgba(0, 0, 0, 0.04)' },
      android: { elevation: 2 },
      web: { boxShadow: '0px 1px 8px rgba(0, 0, 0, 0.04)' },
    }),
  },
  moodEmojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  moodEmoji: { fontSize: 24 },
  moodLabel: { fontSize: 11, color: '#2D332A', fontWeight: '600' },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    ...Platform.select({
      ios: { boxShadow: '0px 1px 6px rgba(0, 0, 0, 0.03)' },
      android: { elevation: 1 },
      web: { boxShadow: '0px 1px 6px rgba(0, 0, 0, 0.03)' },
    }),
  },
  recentDot: { width: 10, height: 10, borderRadius: 5, marginRight: 14 },
  recentContent: { flex: 1 },
  recentMood: { fontSize: 15, fontWeight: '600', color: '#2D332A' },
  recentDate: { fontSize: 12, color: '#8F948B', marginTop: 2 },
  recentEmoji: { fontSize: 20 },
  quickChatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EFE5',
    ...Platform.select({
      ios: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)' },
      android: { elevation: 2 },
      web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)' },
    }),
  },
  quickChatIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E8EFE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  quickChatText: { flex: 1 },
  quickChatTitle: { fontSize: 15, fontWeight: '600', color: '#2D332A', marginBottom: 2 },
  quickChatDesc: { fontSize: 13, color: '#8F948B' },
});
