import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useVoiceInput } from '../hooks/useVoiceInput';

export interface VoiceButtonProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  onTranscription,
  disabled = false,
}) => {
  const {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    error,
  } = useVoiceInput();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulsing animation when recording
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  const handlePress = async () => {
    if (disabled || isTranscribing) return;

    if (isRecording) {
      const text = await stopRecording();
      if (text) {
        onTranscription(text);
      }
    } else {
      await startRecording();
    }
  };

  // Transcribing state: show spinner
  if (isTranscribing) {
    return (
      <TouchableOpacity
        style={[styles.button, styles.transcribingButton]}
        disabled
        activeOpacity={0.7}
      >
        <ActivityIndicator size="small" color={Colors.white} />
      </TouchableOpacity>
    );
  }

  // Recording state: pulsing red circle
  if (isRecording) {
    return (
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[styles.button, styles.recordingButton]}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          <Ionicons name="mic" size={22} color={Colors.white} />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Idle state: mic outline icon
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabledButton]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Ionicons name="mic-outline" size={22} color={Colors.teal500} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  recordingButton: {
    backgroundColor: '#ef4444',
  },
  transcribingButton: {
    backgroundColor: Colors.gray700,
  },
  disabledButton: {
    opacity: 0.4,
  },
});
