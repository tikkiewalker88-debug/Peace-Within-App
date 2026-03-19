import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl
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

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [affirmation, setAffirmation] = useState('');
  const [loadingAffirmation, setLoadingAffirmation] = useState(true);
  const [loadingMood, setLoadingMood] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [recentMoods, setRecentMoods] = useState<any[]>([]);

  const getToken = async () => {
    return await AsyncStorage.getItem('token');
  };

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
      if (res.ok) {
        const data = await res.json();
        setAffirmation(data.affirmation);
      }
    } catch (e) {
      setAffirmation('Every breath is a fresh beginning. You are worthy of peace.');
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
    await Promise.all([loadAffirmation(), loadRecentMoods()]);
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
      }
    } catch (e: any) {
      // silently fail
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

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A6741" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{user?.name || 'Friend'}</Text>
        </View>
        <View style={styles.headerIcon}>
          <Feather name="sun" size={24} color="#4A6741" />
        </View>
      </View>

      {/* Daily Affirmation */}
      <View testID="affirmation-card" style={styles.affirmationCard}>
        <View style={styles.affirmationHeader}>
          <Feather name="star" size={16} color="#C18C5D" />
          <Text style={styles.affirmationLabel}>Today's Affirmation</Text>
        </View>
        {loadingAffirmation ? (
          <ActivityIndicator color="#4A6741" style={{ marginVertical: 20 }} />
        ) : (
          <Text style={styles.affirmationText}>{affirmation}</Text>
        )}
      </View>

      {/* Mood Check-in */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How are you feeling?</Text>
        <Text style={styles.sectionSubtitle}>Tap to check in and receive guidance</Text>
        <View style={styles.moodGrid}>
          {MOODS.map((mood) => (
            <TouchableOpacity
              testID={`mood-${mood.key}`}
              key={mood.key}
              style={[styles.moodItem, loadingMood === mood.key && styles.moodItemActive]}
              onPress={() => handleMoodSelect(mood.key)}
              disabled={loadingMood !== null}
              activeOpacity={0.7}
            >
              {loadingMood === mood.key ? (
                <ActivityIndicator color="#4A6741" />
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
          <Text style={styles.sectionTitle}>Recent Check-ins</Text>
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
    alignItems: 'center',
    paddingVertical: 20,
  },
  greeting: { fontSize: 15, color: '#5C6159', marginBottom: 2 },
  userName: { fontSize: 26, fontWeight: '700', color: '#2D332A' },
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
  },
  affirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  affirmationLabel: { fontSize: 13, color: '#C18C5D', fontWeight: '600', letterSpacing: 1 },
  affirmationText: { fontSize: 20, color: '#F9F7F2', lineHeight: 30, fontWeight: '500' },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#2D332A', marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, color: '#5C6159', marginBottom: 16 },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    padding: 8,
  },
  moodItemActive: { backgroundColor: '#E8EFE5' },
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
  },
  recentDot: { width: 10, height: 10, borderRadius: 5, marginRight: 14 },
  recentContent: { flex: 1 },
  recentMood: { fontSize: 15, fontWeight: '600', color: '#2D332A' },
  recentDate: { fontSize: 12, color: '#8F948B', marginTop: 2 },
  recentEmoji: { fontSize: 20 },
});
