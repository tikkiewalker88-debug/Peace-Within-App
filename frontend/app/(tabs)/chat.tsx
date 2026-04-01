import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const WELCOME_MSG: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Welcome, dear soul. I\'m your Peace Guide — here to listen, reflect, and offer gentle wisdom on relationships, stress, and personal growth. What\'s on your heart today?',
  created_at: new Date().toISOString(),
};

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const getToken = async () => await AsyncStorage.getItem('token');

  useEffect(() => {
    loadUserAndHistory();
  }, []);

  const loadUserAndHistory = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setIsPremium(user.is_premium || false);
      }
    } catch (e) {}
    await loadChatHistory();
  };

  const loadChatHistory = async () => {
    try {
      const token = await getToken();
      const sessRes = await fetch(`${API_URL}/api/chat/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (sessRes.ok) {
        const sessions = await sessRes.json();
        if (sessions.length > 0) {
          const sid = sessions[0].session_id;
          setSessionId(sid);
          const msgRes = await fetch(`${API_URL}/api/chat/history?session_id=${sid}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (msgRes.ok) {
            const msgs = await msgRes.json();
            setMessages(msgs);
          }
        }
      }
    } catch (e) {}
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    // If this is a fresh chat with only the welcome message, remove it
    const isFirstMessage = messages.length === 0 || (messages.length === 1 && messages[0].id === 'welcome');

    const tempMsg: Message = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => {
      const filtered = prev.filter(m => m.id !== 'welcome');
      return [...filtered, tempMsg];
    });

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      });

      if (res.status === 403) {
        const data = await res.json();
        setMessages(prev => [...prev, {
          id: `limit_${Date.now()}`,
          role: 'assistant',
          content: '🔒 ' + (data.detail || 'Daily chat limit reached. Upgrade to Premium for unlimited chats.'),
          created_at: new Date().toISOString(),
        }]);
      } else if (res.ok) {
        const data = await res.json();
        if (!sessionId) setSessionId(data.session_id);
        setMessages(prev => [
          ...prev.filter(m => m.id !== tempMsg.id),
          data.user_message,
          data.ai_message,
        ]);
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: 'I\'m having trouble connecting right now. Please try again in a moment.',
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  };

  const startNewChat = () => {
    setSessionId(null);
    setMessages([WELCOME_MSG]);
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && (
          <View style={styles.avatarAI}>
            <Feather name="sun" size={14} color="#4A6741" />
          </View>
        )}
        <View style={[styles.msgBubble, isUser ? styles.msgBubbleUser : styles.msgBubbleAI]}>
          <Text style={[styles.msgText, isUser ? styles.msgTextUser : styles.msgTextAI]}>
            {item.content}
          </Text>
          <Text style={[styles.msgTime, isUser ? styles.msgTimeUser : styles.msgTimeAI]}>
            {new Date(item.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const showEmptyState = !loading && messages.length === 0;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Feather name="sun" size={18} color="#4A6741" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Peace Guide</Text>
            <Text style={styles.headerSubtitle}>
              {isPremium ? 'Premium · Unlimited' : 'Free · 5 chats/day'}
            </Text>
          </View>
        </View>
        <TouchableOpacity testID="new-chat-btn" style={styles.newChatBtn} onPress={startNewChat}>
          <Feather name="plus" size={20} color="#4A6741" />
        </TouchableOpacity>
      </View>

      {/* Messages or Empty State */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator color="#4A6741" size="large" />
        </View>
      ) : showEmptyState ? (
        <View style={styles.centerContent}>
          <View style={styles.emptyIcon}>
            <Feather name="message-circle" size={36} color="#4A6741" />
          </View>
          <Text style={styles.emptyTitle}>Start a Conversation</Text>
          <Text style={styles.emptyText}>
            Your Peace Guide is here to help with relationships, stress, and personal growth
          </Text>
          <View style={styles.suggestions}>
            {[
              { text: 'How can I manage daily stress?', icon: 'cloud' },
              { text: 'I need relationship advice', icon: 'heart' },
              { text: 'Help me find inner peace', icon: 'sun' },
            ].map((s, i) => (
              <TouchableOpacity
                testID={`suggestion-${i}`}
                key={i}
                style={styles.suggestionChip}
                onPress={() => handleSuggestion(s.text)}
              >
                <Feather name={s.icon as any} size={16} color="#4A6741" />
                <Text style={styles.suggestionText}>{s.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Typing indicator */}
      {sending && (
        <View style={styles.typingRow}>
          <View style={styles.avatarAI}>
            <Feather name="sun" size={12} color="#4A6741" />
          </View>
          <View style={styles.typingBubble}>
            <View style={styles.typingDots}>
              <View style={[styles.typingDot, { opacity: 0.4 }]} />
              <View style={[styles.typingDot, { opacity: 0.7 }]} />
              <View style={[styles.typingDot, { opacity: 1 }]} />
            </View>
          </View>
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          testID="chat-input"
          style={styles.textInput}
          placeholder="Share what's on your mind..."
          placeholderTextColor="#8F948B"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          testID="chat-send-btn"
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || sending}
        >
          <Feather name="send" size={18} color={input.trim() && !sending ? '#FFFFFF' : '#8F948B'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7F2' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2EBE3',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#E8EFE5', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#2D332A' },
  headerSubtitle: { fontSize: 12, color: '#8F948B', marginTop: 1 },
  newChatBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#E8EFE5', justifyContent: 'center', alignItems: 'center',
  },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#E8EFE5', justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#2D332A', marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 15, color: '#5C6159', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  suggestions: { gap: 10, width: '100%' },
  suggestionChip: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2DED6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  suggestionText: { fontSize: 14, color: '#2D332A', fontWeight: '500', flex: 1 },
  messagesList: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end' },
  msgRowUser: { justifyContent: 'flex-end' },
  avatarAI: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#E8EFE5', justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },
  msgBubble: { maxWidth: '78%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  msgBubbleUser: { backgroundColor: '#4A6741', borderBottomRightRadius: 6 },
  msgBubbleAI: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6,
    ...Platform.select({
      ios: { boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.04)' },
      android: { elevation: 1 },
      web: { boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.04)' },
    }),
  },
  msgText: { fontSize: 15, lineHeight: 22 },
  msgTextUser: { color: '#FFFFFF' },
  msgTextAI: { color: '#2D332A' },
  msgTime: { fontSize: 10, marginTop: 6 },
  msgTimeUser: { color: '#B8C4B5', textAlign: 'right' },
  msgTimeAI: { color: '#8F948B' },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  typingBubble: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
  },
  typingDots: { flexDirection: 'row', gap: 4 },
  typingDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#4A6741',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F2EBE3',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F9F7F2',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2D332A',
    maxHeight: 100,
    marginRight: 10,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#4A6741', justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#E2DED6' },
});
