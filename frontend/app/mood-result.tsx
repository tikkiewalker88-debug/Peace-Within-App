import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

const MOOD_COLORS: Record<string, string> = {
  happy: '#F2CC8F', calm: '#81B29A', grateful: '#7C9A6F', stressed: '#E07A5F',
  sad: '#7E9CB6', angry: '#D05353', anxious: '#C18C5D', tired: '#A8A29E',
};

const MOOD_EMOJIS: Record<string, string> = {
  happy: '😊', calm: '😌', grateful: '🙏', stressed: '😰',
  sad: '😢', angry: '😤', anxious: '😟', tired: '😴',
};

export default function MoodResultScreen() {
  const params = useLocalSearchParams<{
    mood: string; motivational: string; scripture: string; exercise: string;
  }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const mood = params.mood || 'calm';
  const color = MOOD_COLORS[mood] || '#4A6741';

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity testID="mood-result-back" style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="x" size={24} color="#2D332A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Guidance</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Mood Badge */}
      <View style={[styles.moodBadge, { backgroundColor: color + '20' }]}>
        <Text style={styles.moodEmoji}>{MOOD_EMOJIS[mood] || '🌿'}</Text>
        <Text style={[styles.moodText, { color }]}>Feeling {mood}</Text>
      </View>

      {/* Motivational Message */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: '#F2CC8F20' }]}>
            <Feather name="sun" size={20} color="#C18C5D" />
          </View>
          <Text style={styles.cardTitle}>Motivational Message</Text>
        </View>
        <Text style={styles.cardContent}>{params.motivational || ''}</Text>
      </View>

      {/* Scripture */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: '#4A674120' }]}>
            <Feather name="book-open" size={20} color="#4A6741" />
          </View>
          <Text style={styles.cardTitle}>Scripture</Text>
        </View>
        <Text style={styles.cardContent}>{params.scripture || ''}</Text>
      </View>

      {/* Grounding Exercise */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: '#81B29A20' }]}>
            <Feather name="wind" size={20} color="#81B29A" />
          </View>
          <Text style={styles.cardTitle}>Grounding Exercise</Text>
        </View>
        <Text style={styles.cardContent}>{params.exercise || ''}</Text>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        testID="mood-result-done"
        style={styles.doneBtn}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Text style={styles.doneBtnText}>Back to Home</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7F2' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#2D332A' },
  moodBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, gap: 8, marginBottom: 24,
  },
  moodEmoji: { fontSize: 24 },
  moodText: { fontSize: 16, fontWeight: '700', textTransform: 'capitalize' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  cardIcon: {
    width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#2D332A' },
  cardContent: { fontSize: 15, color: '#2D332A', lineHeight: 24 },
  doneBtn: {
    backgroundColor: '#4A6741', paddingVertical: 18, borderRadius: 28, alignItems: 'center', marginTop: 10,
    shadowColor: '#4A6741', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  doneBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
