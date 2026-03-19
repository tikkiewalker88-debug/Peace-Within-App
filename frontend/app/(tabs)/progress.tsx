import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const MOOD_COLORS: Record<string, string> = {
  happy: '#F2CC8F',
  calm: '#81B29A',
  grateful: '#7C9A6F',
  stressed: '#E07A5F',
  sad: '#7E9CB6',
  angry: '#D05353',
  anxious: '#C18C5D',
  tired: '#A8A29E',
};

const MOOD_EMOJIS: Record<string, string> = {
  happy: '😊', calm: '😌', grateful: '🙏', stressed: '😰',
  sad: '😢', angry: '😤', anxious: '😟', tired: '😴',
};

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProgress = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/progress`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setProgress(await res.json());
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { loadProgress(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProgress();
    setRefreshing(false);
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#4A6741" />
      </View>
    );
  }

  const totalCheckins = progress?.total_checkins || 0;
  const streak = progress?.current_streak || 0;
  const avgScore = progress?.avg_score || 0;
  const moodDist = progress?.mood_distribution || {};
  const dailyScores = progress?.daily_scores || [];

  const maxMood = Object.entries(moodDist).sort((a: any, b: any) => b[1] - a[1])[0];
  const totalMoodEntries = Object.values(moodDist).reduce((a: any, b: any) => a + b, 0) as number;

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A6741" />}
    >
      <Text style={styles.title}>Your Progress</Text>
      <Text style={styles.subtitle}>Track your emotional journey</Text>

      {totalCheckins === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Feather name="bar-chart-2" size={40} color="#4A6741" />
          </View>
          <Text style={styles.emptyTitle}>No data yet</Text>
          <Text style={styles.emptyText}>Complete your first mood check-in to see your progress</Text>
        </View>
      ) : (
        <>
          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalCheckins}</Text>
              <Text style={styles.statLabel}>Check-ins</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{streak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{avgScore}/5</Text>
              <Text style={styles.statLabel}>Avg Score</Text>
            </View>
          </View>

          {/* Mood Distribution */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mood Distribution</Text>
            {Object.entries(moodDist)
              .sort((a: any, b: any) => b[1] - a[1])
              .map(([mood, count]: [string, any]) => {
                const pct = totalMoodEntries > 0 ? (count / totalMoodEntries) * 100 : 0;
                return (
                  <View key={mood} style={styles.moodBarRow}>
                    <Text style={styles.moodBarEmoji}>{MOOD_EMOJIS[mood] || '🔵'}</Text>
                    <Text style={styles.moodBarLabel}>{mood}</Text>
                    <View style={styles.moodBarTrack}>
                      <View
                        style={[
                          styles.moodBarFill,
                          { width: `${Math.max(pct, 4)}%`, backgroundColor: MOOD_COLORS[mood] || '#8F948B' },
                        ]}
                      />
                    </View>
                    <Text style={styles.moodBarCount}>{count}</Text>
                  </View>
                );
              })}
          </View>

          {/* Recent Trend */}
          {dailyScores.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recent Trend</Text>
              <View style={styles.trendChart}>
                {dailyScores.slice(-7).map((day: any, i: number) => {
                  const height = (day.avg_score / 5) * 100;
                  return (
                    <View key={i} style={styles.trendBarWrap}>
                      <View style={styles.trendBarBg}>
                        <View
                          style={[styles.trendBarFill, { height: `${height}%` }]}
                        />
                      </View>
                      <Text style={styles.trendLabel}>
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'narrow' })}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.trendLegend}>
                <Text style={styles.trendLegendText}>Lower</Text>
                <Text style={styles.trendLegendText}>Higher well-being</Text>
              </View>
            </View>
          )}

          {/* Most Frequent Mood */}
          {maxMood && (
            <View style={[styles.card, { backgroundColor: (MOOD_COLORS[maxMood[0]] || '#4A6741') + '15' }]}>
              <Text style={styles.cardTitle}>Most Frequent Mood</Text>
              <View style={styles.topMoodRow}>
                <Text style={styles.topMoodEmoji}>{MOOD_EMOJIS[maxMood[0]] || '🔵'}</Text>
                <View>
                  <Text style={styles.topMoodName}>{maxMood[0]}</Text>
                  <Text style={styles.topMoodCount}>{maxMood[1] as number} times</Text>
                </View>
              </View>
            </View>
          )}
        </>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7F2' },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: '700', color: '#2D332A', marginTop: 20, marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#5C6159', marginBottom: 24 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#E8EFE5', justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#2D332A', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#5C6159', textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  statValue: { fontSize: 24, fontWeight: '700', color: '#4A6741', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#5C6159', fontWeight: '500' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#2D332A', marginBottom: 16 },
  moodBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  moodBarEmoji: { fontSize: 18, width: 24 },
  moodBarLabel: { fontSize: 13, color: '#2D332A', width: 60, fontWeight: '500', textTransform: 'capitalize' },
  moodBarTrack: { flex: 1, height: 8, backgroundColor: '#F2EBE3', borderRadius: 4, overflow: 'hidden' },
  moodBarFill: { height: '100%', borderRadius: 4 },
  moodBarCount: { fontSize: 13, color: '#5C6159', fontWeight: '600', width: 24, textAlign: 'right' },
  trendChart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120, marginBottom: 8 },
  trendBarWrap: { alignItems: 'center', flex: 1 },
  trendBarBg: { width: 20, height: 100, backgroundColor: '#F2EBE3', borderRadius: 10, overflow: 'hidden', justifyContent: 'flex-end' },
  trendBarFill: { width: '100%', backgroundColor: '#4A6741', borderRadius: 10 },
  trendLabel: { fontSize: 11, color: '#8F948B', marginTop: 4 },
  trendLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  trendLegendText: { fontSize: 11, color: '#8F948B' },
  topMoodRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  topMoodEmoji: { fontSize: 40 },
  topMoodName: { fontSize: 20, fontWeight: '700', color: '#2D332A', textTransform: 'capitalize' },
  topMoodCount: { fontSize: 14, color: '#5C6159' },
});
