import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { MessageBubble } from '../components/MessageBubble';
import { ChatInput } from '../components/ChatInput';
import { Header } from '../components/Header';
import { OfflineBanner } from '../components/OfflineBanner';
import { SuggestedPrompts } from '../components/SuggestedPrompts';
import { AnimatedMessage } from '../components/AnimatedMessage';
import { TypingIndicator } from '../components/TypingIndicator';
import { ChatMessage, streamChat } from '../api/chat';
import { ModeSelector } from '../components/ModeSelector';
import { ChatMode } from '../utils/systemPrompts';

export interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  timestamp?: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: DisplayMessage[];
  createdAt: number;
}

export interface ChatScreenProps {
  messages: DisplayMessage[];
  isStreaming: boolean;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  onSendMessage: (text: string) => void;
  onStopStreaming: () => void;
  onMenuPress: () => void;
  usageUsed?: number;
  usageLimit?: number;
  selectedMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

interface WelcomeViewProps {
  onSendMessage: (text: string) => void;
}

const WelcomeView: React.FC<WelcomeViewProps> = ({ onSendMessage }) => (
  <ScrollView
    contentContainerStyle={styles.welcomeContainer}
    showsVerticalScrollIndicator={false}
  >
    <View style={styles.welcomeIconContainer}>
      <Ionicons name="star" size={48} color={Colors.gold500} />
    </View>
    <Text style={styles.welcomeTitle}>Bienvenue sur</Text>
    <View style={styles.welcomeTitleRow}>
      <Text style={styles.welcomeTitleTeal}>Le Temps </Text>
      <Text style={styles.welcomeTitleGold}>de Dieu</Text>
    </View>
    <Text style={styles.welcomeSubtitle}>
      Posez vos questions et explorez la sagesse divine avec l'aide de
      l'intelligence artificielle.
    </Text>
    <SuggestedPrompts onSelectPrompt={onSendMessage} />
  </ScrollView>
);

export const ChatScreen: React.FC<ChatScreenProps> = ({
  messages,
  isStreaming,
  selectedModel,
  onModelChange,
  onSendMessage,
  onStopStreaming,
  onMenuPress,
  usageUsed,
  usageLimit,
  selectedMode,
  onModeChange,
}) => {
  const flatListRef = useRef<FlatList>(null);
  const scrollButtonOpacity = useRef(new Animated.Value(0)).current;
  const [showScrollButton, setShowScrollButton] = useState(false);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // In an inverted FlatList, contentOffset.y > threshold means user scrolled UP (away from bottom)
      const offsetY = event.nativeEvent.contentOffset.y;
      const shouldShow = offsetY > 300;
      if (shouldShow && !showScrollButton) {
        setShowScrollButton(true);
        Animated.timing(scrollButtonOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      } else if (!shouldShow && showScrollButton) {
        Animated.timing(scrollButtonOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setShowScrollButton(false));
      }
    },
    [showScrollButton, scrollButtonOpacity]
  );

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Find the last assistant message id for retry support
  const reversedMessages = [...messages].reverse();
  const lastAssistantId = reversedMessages.find(
    (m) => m.role === 'assistant'
  )?.id;

  const renderMessage = useCallback(
    ({ item, index }: { item: DisplayMessage; index: number }) => {
      const isLastAssistant = item.id === lastAssistantId;
      // For retry: find the user message that precedes this assistant message
      let onRetry: (() => void) | undefined;
      if (isLastAssistant) {
        // In the reversed array, the user message before this assistant is at index+1
        const prevMsg = reversedMessages[index + 1];
        if (prevMsg && prevMsg.role === 'user') {
          onRetry = () => onSendMessage(prevMsg.content);
        }
      }

      return (
        <AnimatedMessage index={index}>
          <MessageBubble
            role={item.role}
            content={item.content}
            isStreaming={item.isStreaming}
            timestamp={item.timestamp}
            isLastAssistant={isLastAssistant}
            onRetry={onRetry}
          />
        </AnimatedMessage>
      );
    },
    [lastAssistantId, reversedMessages, onSendMessage]
  );

  const keyExtractor = useCallback((item: DisplayMessage) => item.id, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <Header
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        onMenuPress={onMenuPress}
        usageUsed={usageUsed}
        usageLimit={usageLimit}
      />
      <OfflineBanner />
      <ModeSelector selectedMode={selectedMode} onModeChange={onModeChange} />

      <View style={styles.messagesContainer}>
        {messages.length === 0 ? (
          <WelcomeView onSendMessage={onSendMessage} />
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={reversedMessages}
              renderItem={renderMessage}
              keyExtractor={keyExtractor}
              inverted
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              onScroll={handleScroll}
              scrollEventThrottle={16}
              ListHeaderComponent={
                isStreaming &&
                messages.length > 0 &&
                messages[messages.length - 1].content === '' ? (
                  <TypingIndicator />
                ) : null
              }
            />
            {showScrollButton && (
              <Animated.View
                style={[
                  styles.scrollToBottomButton,
                  { opacity: scrollButtonOpacity },
                ]}
              >
                <TouchableOpacity
                  onPress={scrollToBottom}
                  activeOpacity={0.8}
                  style={styles.scrollToBottomTouchable}
                >
                  <Ionicons name="chevron-down" size={22} color={Colors.white} />
                </TouchableOpacity>
              </Animated.View>
            )}
          </>
        )}
      </View>

      <ChatInput
        onSend={onSendMessage}
        isStreaming={isStreaming}
        onStop={onStopStreaming}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy950,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    paddingVertical: 8,
  },
  welcomeContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  welcomeIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.whiteBorder05,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.whiteBorder10,
  },
  welcomeTitle: {
    fontSize: 16,
    color: Colors.gray400,
    fontWeight: '500',
    marginBottom: 4,
  },
  welcomeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeTitleTeal: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.teal500,
  },
  welcomeTitleGold: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.gold500,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 22,
  },
  scrollToBottomButton: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    zIndex: 10,
  },
  scrollToBottomTouchable: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.teal500,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

export { generateId };
