import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const MOOD_COLORS: Record<string, string> = {
  happy: '#F2CC8F', calm: '#81B29A', grateful: '#7C9A6F', stressed: '#E07A5F',
  sad: '#7E9CB6', angry: '#D05353', anxious: '#C18C5D', tired: '#A8A29E',
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

  const getWellnessLevel = (score: number) => {
    if (score >= 4) return { label: 'Thriving', color: '#7C9A6F' };
    if (score >= 3) return { label: 'Growing', color: '#81B29A' };
    if (score >= 2) return { label: 'Healing', color: '#C18C5D' };
    return { label: 'Seeking', color: '#E07A5F' };
  };

  const wellness = getWellnessLevel(avgScore);

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A6741" />}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Your Journey</Text>
      <Text style={styles.subtitle}>Track your emotional wellness over time</Text>

      {totalCheckins === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Feather name="bar-chart-2" size={36} color="#4A6741" />
          </View>
          <Text style={styles.emptyTitle}>Your journey begins here</Text>
          <Text style={styles.emptyText}>Complete your first mood check-in on the Home screen to start tracking your progress</Text>
        </View>
      ) : (
        <>
          {/* Wellness Score */}
          <View style={[styles.wellnessCard, { borderLeftColor: wellness.color }]}>
            <View style={styles.wellnessRow}>
              <View>
                <Text style={styles.wellnessLabel}>Wellness Level</Text>
                <Text style={[styles.wellnessValue, { color: wellness.color }]}>{wellness.label}</Text>
              </View>
              <View style={[styles.scoreCircle, { borderColor: wellness.color }]}>
                <Text style={[styles.scoreText, { color: wellness.color }]}>{avgScore}</Text>
                <Text style={styles.scoreMax}>/5</Text>
              </View>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Feather name="check-circle" size={20} color="#4A6741" />
              <Text style={styles.statValue}>{totalCheckins}</Text>
              <Text style={styles.statLabel}>Check-ins</Text>
            </View>
            <View style={styles.statCard}>
              <Feather name="zap" size={20} color="#C18C5D" />
              <Text style={styles.statValue}>{streak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statCard}>
              <Feather name="activity" size={20} color="#81B29A" />
              <Text style={styles.statValue}>{Object.keys(moodDist).length}</Text>
              <Text style={styles.statLabel}>Moods Felt</Text>
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
                          { width: `${Math.max(pct, 6)}%`, backgroundColor: MOOD_COLORS[mood] || '#8F948B' },
                        ]}
                      />
                    </View>
                    <Text style={styles.moodBarPct}>{Math.round(pct)}%</Text>
                  </View>
                );
              })}
          </View>

          {/* Recent Trend */}
          {dailyScores.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Weekly Trend</Text>
              <View style={styles.trendChart}>
                {dailyScores.slice(-7).map((day: any, i: number) => {
                  const height = (day.avg_score / 5) * 100;
                  const barColor = day.avg_score >= 4 ? '#7C9A6F' : day.avg_score >= 3 ? '#81B29A' : day.avg_score >= 2 ? '#C18C5D' : '#E07A5F';
                  return (
                    <View key={i} style={styles.trendBarWrap}>
                      <Text style={styles.trendScore}>{day.avg_score}</Text>
                      <View style={styles.trendBarBg}>
                        <View
                          style={[styles.trendBarFill, { height: `${height}%`, backgroundColor: barColor }]}
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
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#E07A5F' }]} />
                  <Text style={styles.legendText}>Low</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#81B29A' }]} />
                  <Text style={styles.legendText}>Medium</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#7C9A6F' }]} />
                  <Text style={styles.legendText}>High</Text>
                </View>
              </View>
            </View>
          )}

          {/* Most Frequent Mood */}
          {maxMood && (
            <View style={[styles.card, { backgroundColor: (MOOD_COLORS[maxMood[0]] || '#4A6741') + '12' }]}>
              <Text style={styles.cardTitle}>Most Frequent Mood</Text>
              <View style={styles.topMoodRow}>
                <Text style={styles.topMoodEmoji}>{MOOD_EMOJIS[maxMood[0]] || '🔵'}</Text>
                <View>
                  <Text style={styles.topMoodName}>{maxMood[0]}</Text>
                  <Text style={styles.topMoodCount}>{maxMood[1] as number} out of {totalCheckins} check-ins</Text>
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
  title: { fontSize: 28, fontWeight: '700', color: '#2D332A', marginTop: 20, marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#5C6159', marginBottom: 24 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#E8EFE5', justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#2D332A', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#5C6159', textAlign: 'center', lineHeight: 22 },
  wellnessCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: { boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.04)' },
      android: { elevation: 2 },
      web: { boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.04)' },
    }),
  },
  wellnessRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wellnessLabel: { fontSize: 13, color: '#8F948B', fontWeight: '500', marginBottom: 4 },
  wellnessValue: { fontSize: 24, fontWeight: '700' },
  scoreCircle: {
    width: 56, height: 56, borderRadius: 28, borderWidth: 3,
    justifyContent: 'center', alignItems: 'center', flexDirection: 'row',
  },
  scoreText: { fontSize: 20, fontWeight: '700' },
  scoreMax: { fontSize: 12, color: '#8F948B' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, alignItems: 'center', gap: 6,
    ...Platform.select({
      ios: { boxShadow: '0px 1px 6px rgba(0, 0, 0, 0.04)' },
      android: { elevation: 2 },
      web: { boxShadow: '0px 1px 6px rgba(0, 0, 0, 0.04)' },
    }),
  },
  statValue: { fontSize: 22, fontWeight: '700', color: '#2D332A' },
  statLabel: { fontSize: 11, color: '#8F948B', fontWeight: '500' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16,
    ...Platform.select({
      ios: { boxShadow: '0px 1px 8px rgba(0, 0, 0, 0.04)' },
      android: { elevation: 2 },
      web: { boxShadow: '0px 1px 8px rgba(0, 0, 0, 0.04)' },
    }),
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#2D332A', marginBottom: 16 },
  moodBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  moodBarEmoji: { fontSize: 18, width: 24 },
  moodBarLabel: { fontSize: 13, color: '#2D332A', width: 60, fontWeight: '500', textTransform: 'capitalize' },
  moodBarTrack: { flex: 1, height: 10, backgroundColor: '#F2EBE3', borderRadius: 5, overflow: 'hidden' },
  moodBarFill: { height: '100%', borderRadius: 5 },
  moodBarPct: { fontSize: 13, color: '#5C6159', fontWeight: '600', width: 32, textAlign: 'right' },
  trendChart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 130, marginBottom: 12 },
  trendBarWrap: { alignItems: 'center', flex: 1 },
  trendScore: { fontSize: 10, color: '#8F948B', marginBottom: 4, fontWeight: '600' },
  trendBarBg: { width: 22, height: 100, backgroundColor: '#F2EBE3', borderRadius: 11, overflow: 'hidden', justifyContent: 'flex-end' },
  trendBarFill: { width: '100%', borderRadius: 11 },
  trendLabel: { fontSize: 11, color: '#8F948B', marginTop: 6, fontWeight: '500' },
  trendLegend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#8F948B' },
  topMoodRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  topMoodEmoji: { fontSize: 40 },
  topMoodName: { fontSize: 22, fontWeight: '700', color: '#2D332A', textTransform: 'capitalize' },
  topMoodCount: { fontSize: 14, color: '#5C6159', marginTop: 2 },
});
