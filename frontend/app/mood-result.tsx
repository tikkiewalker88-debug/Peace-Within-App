import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
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

const MOOD_MESSAGES: Record<string, string> = {
  happy: 'What a beautiful feeling! Let\'s nurture this joy.',
  calm: 'You\'re in a peaceful place. Let\'s deepen this serenity.',
  grateful: 'Gratitude opens the door to abundance.',
  stressed: 'It\'s okay to pause. Let\'s find your center together.',
  sad: 'Your feelings are valid. Gentle healing awaits.',
  angry: 'This energy can be transformed. Let\'s channel it wisely.',
  anxious: 'You\'re safe right now. Let\'s ground together.',
  tired: 'Rest is not laziness — it\'s restoration.',
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
      showsVerticalScrollIndicator={false}
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
      <View style={[styles.moodBadge, { backgroundColor: color + '18' }]}>
        <Text style={styles.moodEmoji}>{MOOD_EMOJIS[mood] || '🌿'}</Text>
        <View>
          <Text style={[styles.moodText, { color }]}>Feeling {mood}</Text>
          <Text style={styles.moodSubtext}>{MOOD_MESSAGES[mood] || ''}</Text>
        </View>
      </View>

      {/* Motivational Message */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: '#F2CC8F18' }]}>
            <Feather name="sun" size={20} color="#C18C5D" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Motivational Message</Text>
            <Text style={styles.cardSubtitle}>Words to uplift your spirit</Text>
          </View>
        </View>
        <Text style={styles.cardContent}>{params.motivational || ''}</Text>
      </View>

      {/* Scripture */}
      <View style={[styles.card, styles.scriptureCard]}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: '#4A674118' }]}>
            <Feather name="book-open" size={20} color="#4A6741" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Scripture</Text>
            <Text style={styles.cardSubtitle}>Wisdom for your soul</Text>
          </View>
        </View>
        <Text style={styles.scriptureContent}>{params.scripture || ''}</Text>
      </View>

      {/* Grounding Exercise */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: '#81B29A18' }]}>
            <Feather name="wind" size={20} color="#81B29A" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Grounding Exercise</Text>
            <Text style={styles.cardSubtitle}>Find your center now</Text>
          </View>
        </View>
        <Text style={styles.cardContent}>{params.exercise || ''}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          testID="mood-result-done"
          style={styles.doneBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Feather name="home" size={18} color="#FFFFFF" />
          <Text style={styles.doneBtnText}>Back to Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="mood-result-chat"
          style={styles.chatBtn}
          onPress={() => { router.back(); setTimeout(() => router.push('/(tabs)/chat'), 100); }}
          activeOpacity={0.8}
        >
          <Feather name="message-circle" size={18} color="#4A6741" />
          <Text style={styles.chatBtnText}>Talk to Peace Guide</Text>
        </TouchableOpacity>
      </View>

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
  backBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#F2EBE3',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#2D332A' },
  moodBadge: {
    flexDirection: 'row', alignItems: 'center',
    padding: 18, borderRadius: 20, gap: 14, marginBottom: 24,
  },
  moodEmoji: { fontSize: 36 },
  moodText: { fontSize: 20, fontWeight: '700', textTransform: 'capitalize' },
  moodSubtext: { fontSize: 13, color: '#5C6159', marginTop: 2 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 14,
    ...Platform.select({
      ios: { boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.04)' },
      android: { elevation: 2 },
      web: { boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.04)' },
    }),
  },
  scriptureCard: {
    backgroundColor: '#2E4228',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  cardIcon: {
    width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#2D332A' },
  cardSubtitle: { fontSize: 12, color: '#8F948B', marginTop: 1 },
  cardContent: { fontSize: 15, color: '#2D332A', lineHeight: 24 },
  scriptureContent: { fontSize: 16, color: '#F9F7F2', lineHeight: 26, fontStyle: 'italic' },
  actions: { gap: 10, marginTop: 8 },
  doneBtn: {
    backgroundColor: '#4A6741', paddingVertical: 18, borderRadius: 28, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    ...Platform.select({
      ios: { boxShadow: '0px 4px 12px rgba(74, 103, 65, 0.25)' },
      android: { elevation: 4 },
      web: { boxShadow: '0px 4px 12px rgba(74, 103, 65, 0.25)' },
    }),
  },
  doneBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  chatBtn: {
    backgroundColor: '#E8EFE5', paddingVertical: 16, borderRadius: 28, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  chatBtnText: { color: '#4A6741', fontSize: 16, fontWeight: '600' },
});
