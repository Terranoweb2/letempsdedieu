import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

// Safe import of expo-speech (may not be available in all builds)
let Speech: any = null;
try {
  Speech = require('expo-speech');
} catch (e) {
  console.warn('expo-speech not available');
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export interface UseVoiceModeChatReturn {
  isVoiceMode: boolean;
  voiceState: VoiceState;
  lastUserText: string;
  lastAiText: string;
  enterVoiceMode: () => void;
  exitVoiceMode: () => void;
  startListening: () => Promise<void>;
  stopListening: () => Promise<string | null>;
  speakText: (text: string) => Promise<void>;
  stopSpeaking: () => void;
}

const TRANSCRIBE_URL = 'https://voietv.org/api/transcribe';

export function useVoiceModeChat(): UseVoiceModeChatReturn {
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [lastUserText, setLastUserText] = useState('');
  const [lastAiText, setLastAiText] = useState('');
  const recordingRef = useRef<Audio.Recording | null>(null);

  const enterVoiceMode = useCallback(() => {
    setIsVoiceMode(true);
    setVoiceState('idle');
    setLastUserText('');
    setLastAiText('');
  }, []);

  const exitVoiceMode = useCallback(() => {
    // Stop any ongoing recording
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
    // Stop any speech
    Speech?.stop();
    setIsVoiceMode(false);
    setVoiceState('idle');
  }, []);

  const startListening = useCallback(async () => {
    try {
      // Stop any speech
      Speech?.stop();

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setVoiceState('listening');
    } catch (err) {
      console.error('Failed to start recording:', err);
      setVoiceState('idle');
    }
  }, []);

  const stopListening = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current) return null;

    try {
      setVoiceState('processing');

      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        setVoiceState('idle');
        return null;
      }

      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);

      const response = await fetch(TRANSCRIBE_URL, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!response.ok) {
        setVoiceState('idle');
        return null;
      }

      const data = await response.json();
      const text = data.text || data.transcription || null;

      if (text) {
        setLastUserText(text);
      }

      return text;
    } catch (err) {
      console.error('Transcription error:', err);
      setVoiceState('idle');
      recordingRef.current = null;
      return null;
    }
  }, []);

  const speakText = useCallback(async (text: string): Promise<void> => {
    // Clean markdown
    const clean = text
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]+`/g, ' ')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[-*+]\s/g, '')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .trim();

    if (!clean) {
      setVoiceState('idle');
      return;
    }

    setLastAiText(text);
    setVoiceState('speaking');

    return new Promise<void>((resolve) => {
      if (!Speech) {
        setVoiceState('idle');
        resolve();
        return;
      }
      Speech.speak(clean, {
        language: 'fr-FR',
        rate: 1.0,
        pitch: 1.0,
        onDone: () => {
          setVoiceState('idle');
          resolve();
        },
        onError: () => {
          setVoiceState('idle');
          resolve();
        },
        onStopped: () => {
          setVoiceState('idle');
          resolve();
        },
      });
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    Speech?.stop();
    setVoiceState('idle');
  }, []);

  return {
    isVoiceMode,
    voiceState,
    lastUserText,
    lastAiText,
    enterVoiceMode,
    exitVoiceMode,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
  };
}
