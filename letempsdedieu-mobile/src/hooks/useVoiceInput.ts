import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

export interface UseVoiceInputReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  error: string | null;
}

const TRANSCRIBE_URL = 'https://voietv.org/api/transcribe';

export function useVoiceInput(): UseVoiceInputReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Request microphone permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission microphone refusée');
        return;
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording with high quality preset
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Impossible de démarrer l\'enregistrement');
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current) {
      return null;
    }

    try {
      setIsRecording(false);
      setIsTranscribing(true);
      setError(null);

      // Stop the recording
      await recordingRef.current.stopAndUnloadAsync();

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      // Get the recorded file URI
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        setError('Aucun fichier audio enregistré');
        setIsTranscribing(false);
        return null;
      }

      // Determine file extension based on platform
      const fileExtension = Platform.OS === 'ios' ? 'm4a' : 'm4a';
      const mimeType = 'audio/m4a';

      // Build multipart form data
      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: mimeType,
        name: `recording.${fileExtension}`,
      } as any);

      // Send to transcription API
      const response = await fetch(TRANSCRIBE_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status}`);
      }

      const data = await response.json();
      const transcribedText = data.text || data.transcription || null;

      setIsTranscribing(false);
      return transcribedText;
    } catch (err) {
      console.error('Failed to stop/transcribe recording:', err);
      setError('Erreur lors de la transcription');
      setIsTranscribing(false);
      recordingRef.current = null;
      return null;
    }
  }, []);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    error,
  };
}
