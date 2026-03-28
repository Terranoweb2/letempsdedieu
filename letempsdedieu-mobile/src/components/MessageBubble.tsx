import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { MarkdownText } from './MarkdownText';
import { MessageActions } from './MessageActions';

export interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  isLastAssistant?: boolean;
  onRetry?: () => void;
  timestamp?: number;
}

const formatTime = (ts: number): string => {
  const date = new Date(ts);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  role,
  content,
  isStreaming = false,
  isLastAssistant = false,
  onRetry,
  timestamp,
}) => {
  const isUser = role === 'user';
  const [showActions, setShowActions] = useState(false);

  const handleLongPress = () => {
    setShowActions(true);
  };

  const handleDismiss = () => {
    setShowActions(false);
  };

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
    >
      {!isUser && (
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>AI</Text>
        </View>
      )}
      <View style={styles.bubbleWrapper}>
        {showActions && (
          <MessageActions
            content={content}
            isLastAssistant={isLastAssistant}
            onRetry={onRetry}
            onDismiss={handleDismiss}
          />
        )}
        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={handleLongPress}
          onPress={showActions ? handleDismiss : undefined}
          style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          {isUser ? (
            <Text
              style={[styles.messageText, styles.userText]}
              selectable
            >
              {content}
            </Text>
          ) : (
            <View>
              <MarkdownText content={content} isUser={false} />
              {isStreaming && <Text style={styles.cursor}>|</Text>}
            </View>
          )}
        </TouchableOpacity>
        {timestamp != null && (
          <Text
            style={[
              styles.timestampText,
              isUser ? styles.timestampUser : styles.timestampAssistant,
            ]}
          >
            {formatTime(timestamp)}
          </Text>
        )}
      </View>
      {isUser && (
        <View style={[styles.avatarContainer, styles.userAvatar]}>
          <Text style={styles.avatarText}>Vous</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    marginHorizontal: 12,
    alignItems: 'flex-start',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  assistantContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.teal700,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  userAvatar: {
    backgroundColor: Colors.gold500,
    marginLeft: 8,
  },
  avatarText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  bubbleWrapper: {
    maxWidth: '75%',
    flexDirection: 'column',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: Colors.teal700,
    borderBottomRightRadius: 4,
    marginLeft: 40,
  },
  assistantBubble: {
    backgroundColor: Colors.navy900,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.whiteBorder10,
    marginLeft: 8,
    marginRight: 40,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: Colors.white,
  },
  assistantText: {
    color: Colors.gray100,
  },
  cursor: {
    color: Colors.teal500,
    fontWeight: '300',
  },
  timestampText: {
    fontSize: 11,
    color: Colors.gray600,
    marginTop: 2,
  },
  timestampUser: {
    textAlign: 'right',
    marginRight: 4,
  },
  timestampAssistant: {
    textAlign: 'left',
    marginLeft: 12,
  },
});
