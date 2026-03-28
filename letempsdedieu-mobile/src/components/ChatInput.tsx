import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { VoiceButton } from './VoiceButton';

export interface ChatInputProps {
  onSend: (text: string) => void;
  isStreaming: boolean;
  onStop?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  isStreaming,
  onStop,
}) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed && !isStreaming) {
      onSend(trimmed);
      setText('');
    }
  };

  const handleStop = () => {
    if (onStop) {
      onStop();
    }
  };

  const handleTranscription = (transcribedText: string) => {
    setText(transcribedText);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        {!isStreaming && (
          <VoiceButton
            onTranscription={handleTranscription}
            disabled={isStreaming}
          />
        )}
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Posez votre question..."
          placeholderTextColor={Colors.gray500}
          multiline
          maxLength={4000}
          editable={!isStreaming}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        {isStreaming ? (
          <TouchableOpacity
            style={[styles.sendButton, styles.stopButton]}
            onPress={handleStop}
            activeOpacity={0.7}
          >
            <Ionicons name="stop" size={22} color={Colors.white} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.sendButton,
              !text.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!text.trim()}
            activeOpacity={0.7}
          >
            <Ionicons name="send" size={20} color={Colors.white} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: Colors.navy950,
    borderTopWidth: 1,
    borderTopColor: Colors.whiteBorder10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.navy800,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 16,
    fontSize: 15,
    color: Colors.white,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.whiteBorder10,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.teal700,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.gray700,
    opacity: 0.5,
  },
  stopButton: {
    backgroundColor: '#ef4444',
  },
});
