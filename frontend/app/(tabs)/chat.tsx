import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator
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

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const getToken = async () => await AsyncStorage.getItem('token');

  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const token = await getToken();
      // Get most recent session
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

    // Optimistic add
    const tempMsg: Message = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);

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
          content: data.detail || 'Daily chat limit reached. Upgrade to Premium for unlimited chats.',
          created_at: new Date().toISOString(),
        }]);
      } else if (res.ok) {
        const data = await res.json();
        if (!sessionId) setSessionId(data.session_id);
        // Replace temp message and add AI response
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
        content: 'Sorry, I couldn\'t connect. Please try again.',
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  };

  const startNewChat = () => {
    setSessionId(null);
    setMessages([]);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && (
          <View style={styles.avatarAI}>
            <Feather name="sun" size={16} color="#4A6741" />
          </View>
        )}
        <View style={[styles.msgBubble, isUser ? styles.msgBubbleUser : styles.msgBubbleAI]}>
          <Text style={[styles.msgText, isUser ? styles.msgTextUser : styles.msgTextAI]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Peace Guide</Text>
          <Text style={styles.headerSubtitle}>Your spiritual wellness companion</Text>
        </View>
        <TouchableOpacity testID="new-chat-btn" style={styles.newChatBtn} onPress={startNewChat}>
          <Feather name="plus" size={20} color="#4A6741" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator color="#4A6741" size="large" />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.centerContent}>
          <View style={styles.emptyIcon}>
            <Feather name="message-circle" size={40} color="#4A6741" />
          </View>
          <Text style={styles.emptyTitle}>Start a Conversation</Text>
          <Text style={styles.emptyText}>
            Ask about relationships, stress management, or personal growth
          </Text>
          <View style={styles.suggestions}>
            {['How can I manage stress?', 'I need relationship advice', 'Help me grow spiritually'].map((s, i) => (
              <TouchableOpacity
                testID={`suggestion-${i}`}
                key={i}
                style={styles.suggestionChip}
                onPress={() => { setInput(s); }}
              >
                <Text style={styles.suggestionText}>{s}</Text>
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
        />
      )}

      {/* Typing indicator */}
      {sending && (
        <View style={styles.typingRow}>
          <View style={styles.avatarAI}>
            <Feather name="sun" size={12} color="#4A6741" />
          </View>
          <View style={styles.typingBubble}>
            <Text style={styles.typingText}>Reflecting...</Text>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2EBE3',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#2D332A' },
  headerSubtitle: { fontSize: 13, color: '#5C6159', marginTop: 2 },
  newChatBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8EFE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8EFE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#2D332A', marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 15, color: '#5C6159', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  suggestions: { gap: 10, width: '100%' },
  suggestionChip: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2DED6',
  },
  suggestionText: { fontSize: 14, color: '#4A6741', fontWeight: '500', textAlign: 'center' },
  messagesList: { paddingHorizontal: 16, paddingVertical: 12 },
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  msgRowUser: { justifyContent: 'flex-end' },
  avatarAI: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8EFE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  msgBubble: { maxWidth: '75%', padding: 14, borderRadius: 20 },
  msgBubbleUser: { backgroundColor: '#4A6741', borderBottomRightRadius: 6 },
  msgBubbleAI: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 6 },
  msgText: { fontSize: 15, lineHeight: 22 },
  msgTextUser: { color: '#FFFFFF' },
  msgTextAI: { color: '#2D332A' },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  typingBubble: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  typingText: { fontSize: 13, color: '#8F948B', fontStyle: 'italic' },
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
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2D332A',
    maxHeight: 100,
    marginRight: 10,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4A6741',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#E2DED6' },
});
