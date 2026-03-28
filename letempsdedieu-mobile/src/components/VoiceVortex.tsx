import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { VoiceState } from '../hooks/useVoiceModeChat';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CORE_SIZE = 120;
const MIDDLE_SIZE = 150;
const OUTER_SIZE = 180;

interface VoiceVortexProps {
  voiceState: VoiceState;
  lastUserText: string;
  lastAiText: string;
  isStreaming: boolean;
  onTapVortex: () => void;
  onClose: () => void;
}

export const VoiceVortex: React.FC<VoiceVortexProps> = ({
  voiceState,
  lastUserText,
  lastAiText,
  isStreaming,
  onTapVortex,
  onClose,
}) => {
  // Animated values
  const outerScale = useRef(new Animated.Value(1)).current;
  const middleScale = useRef(new Animated.Value(1)).current;
  const outerOpacity = useRef(new Animated.Value(0.05)).current;
  const middleOpacity = useRef(new Animated.Value(0.1)).current;
  const coreGlow = useRef(new Animated.Value(0)).current;
  const spinValue = useRef(new Animated.Value(0)).current;

  // Waveform bars animation
  const bar1 = useRef(new Animated.Value(20)).current;
  const bar2 = useRef(new Animated.Value(30)).current;
  const bar3 = useRef(new Animated.Value(24)).current;
  const bar4 = useRef(new Animated.Value(16)).current;

  // Pulse animation for speaking
  const speakPulse = useRef(new Animated.Value(1)).current;

  // Double tap detection
  const lastTapRef = useRef(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      onTapVortex();
    }
    lastTapRef.current = now;
  }, [onTapVortex]);

  // Ring animations based on state
  useEffect(() => {
    const config = {
      idle: { outer: 1.0, middle: 1.0, outerOp: 0.05, middleOp: 0.05 },
      listening: { outer: 1.6, middle: 1.3, outerOp: 0.1, middleOp: 0.15 },
      processing: { outer: 1.4, middle: 1.2, outerOp: 0.1, middleOp: 0.15 },
      speaking: { outer: 1.5, middle: 1.25, outerOp: 0.15, middleOp: 0.2 },
    }[voiceState];

    Animated.parallel([
      Animated.spring(outerScale, {
        toValue: config.outer,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(middleScale, {
        toValue: config.middle,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(outerOpacity, {
        toValue: config.outerOp,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(middleOpacity, {
        toValue: config.middleOp,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [voiceState]);

  // Glow pulse for active states
  useEffect(() => {
    if (voiceState === 'idle') {
      coreGlow.setValue(0);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(coreGlow, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(coreGlow, {
          toValue: 0.3,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [voiceState]);

  // Spinner for processing
  useEffect(() => {
    if (voiceState === 'processing') {
      const spin = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spin.start();
      return () => spin.stop();
    } else {
      spinValue.setValue(0);
    }
  }, [voiceState]);

  // Waveform bars for listening
  useEffect(() => {
    if (voiceState === 'listening') {
      const animateBar = (bar: Animated.Value, min: number, max: number, duration: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(bar, { toValue: max, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
            Animated.timing(bar, { toValue: min, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          ])
        );

      const a1 = animateBar(bar1, 10, 35, 400);
      const a2 = animateBar(bar2, 15, 40, 350);
      const a3 = animateBar(bar3, 12, 32, 450);
      const a4 = animateBar(bar4, 8, 28, 500);

      a1.start();
      a2.start();
      a3.start();
      a4.start();

      return () => {
        a1.stop();
        a2.stop();
        a3.stop();
        a4.stop();
      };
    } else {
      bar1.setValue(20);
      bar2.setValue(30);
      bar3.setValue(24);
      bar4.setValue(16);
    }
  }, [voiceState]);

  // Speaking pulse
  useEffect(() => {
    if (voiceState === 'speaking') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(speakPulse, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(speakPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      speakPulse.setValue(1);
    }
  }, [voiceState]);

  const spinInterpolate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const stateColors = {
    idle: { core: ['#1a2744', '#0f1a2e'], ring: 'rgba(255,255,255,0.05)' },
    listening: { core: ['#0d9488', '#0b8278'], ring: 'rgba(13,148,136,0.15)' },
    processing: { core: ['#c4a35a', '#b8963a'], ring: 'rgba(196,163,90,0.15)' },
    speaking: { core: ['#0d9488', '#14b8a6'], ring: 'rgba(13,148,136,0.2)' },
  };

  const colors = stateColors[voiceState];

  const stateLabel =
    voiceState === 'listening' ? 'Ecoute...'
    : voiceState === 'processing' ? 'Transcription...'
    : voiceState === 'speaking' ? 'Reponse...'
    : isStreaming ? 'Reflexion...'
    : 'Appuyez pour parler';

  return (
    <View style={styles.container}>
      {/* Close button */}
      <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
        <Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>

      {/* Vortex */}
      <TouchableOpacity
        style={styles.vortexContainer}
        onPress={handleTap}
        activeOpacity={1}
      >
        {/* Outer ring */}
        <Animated.View
          style={[
            styles.ring,
            {
              width: OUTER_SIZE,
              height: OUTER_SIZE,
              borderRadius: OUTER_SIZE / 2,
              transform: [{ scale: outerScale }],
              opacity: outerOpacity,
              backgroundColor:
                voiceState === 'listening' ? 'rgba(13,148,136,0.3)'
                : voiceState === 'processing' ? 'rgba(196,163,90,0.3)'
                : voiceState === 'speaking' ? 'rgba(13,148,136,0.35)'
                : 'rgba(255,255,255,0.1)',
            },
          ]}
        />

        {/* Middle ring */}
        <Animated.View
          style={[
            styles.ring,
            {
              width: MIDDLE_SIZE,
              height: MIDDLE_SIZE,
              borderRadius: MIDDLE_SIZE / 2,
              transform: [{ scale: middleScale }],
              opacity: middleOpacity,
              backgroundColor:
                voiceState === 'listening' ? 'rgba(13,148,136,0.4)'
                : voiceState === 'processing' ? 'rgba(196,163,90,0.4)'
                : voiceState === 'speaking' ? 'rgba(13,148,136,0.45)'
                : 'rgba(255,255,255,0.1)',
            },
          ]}
        />

        {/* Core circle */}
        <Animated.View
          style={[
            styles.core,
            {
              transform: [{ scale: speakPulse }],
              backgroundColor:
                voiceState === 'listening' ? '#0d9488'
                : voiceState === 'processing' ? '#c4a35a'
                : voiceState === 'speaking' ? '#0d9488'
                : '#1a2744',
              borderWidth: voiceState === 'idle' ? 1 : 0,
              borderColor: 'rgba(255,255,255,0.1)',
              shadowColor:
                voiceState === 'listening' ? '#0d9488'
                : voiceState === 'processing' ? '#c4a35a'
                : voiceState === 'speaking' ? '#0d9488'
                : 'transparent',
              shadowOpacity: voiceState === 'idle' ? 0 : 0.5,
              shadowRadius: 20,
              elevation: voiceState === 'idle' ? 0 : 10,
            },
          ]}
        >
          {voiceState === 'listening' ? (
            // Waveform bars
            <View style={styles.waveformContainer}>
              <Animated.View style={[styles.waveBar, { height: bar1 }]} />
              <Animated.View style={[styles.waveBar, { height: bar2 }]} />
              <Animated.View style={[styles.waveBar, { height: bar3 }]} />
              <Animated.View style={[styles.waveBar, { height: bar4 }]} />
            </View>
          ) : voiceState === 'processing' ? (
            // Spinner
            <Animated.View
              style={[
                styles.spinner,
                { transform: [{ rotate: spinInterpolate }] },
              ]}
            />
          ) : voiceState === 'speaking' ? (
            // Speaker icon
            <Ionicons name="volume-high" size={40} color="rgba(255,255,255,0.8)" />
          ) : (
            // Mic icon (idle)
            <Ionicons name="mic-outline" size={40} color="rgba(255,255,255,0.3)" />
          )}
        </Animated.View>
      </TouchableOpacity>

      {/* State label */}
      <Text style={styles.stateLabel}>{stateLabel}</Text>
      <Text style={styles.hint}>Double-tap pour arreter</Text>

      {/* Transcription display */}
      <View style={styles.transcriptContainer}>
        {lastUserText ? (
          <Text style={styles.userText} numberOfLines={2}>
            <Text style={styles.userLabel}>Vous: </Text>
            {lastUserText}
          </Text>
        ) : null}
        {lastAiText ? (
          <Text style={styles.aiText} numberOfLines={3}>
            <Text style={styles.aiLabel}>IA: </Text>
            {lastAiText.length > 150 ? lastAiText.slice(0, 150) + '...' : lastAiText}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy950,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  vortexContainer: {
    width: OUTER_SIZE * 1.8,
    height: OUTER_SIZE * 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
  },
  core: {
    width: CORE_SIZE,
    height: CORE_SIZE,
    borderRadius: CORE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 40,
  },
  waveBar: {
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 3,
  },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.6)',
    borderTopColor: 'transparent',
  },
  stateLabel: {
    marginTop: 24,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  hint: {
    marginTop: 4,
    fontSize: 10,
    color: 'rgba(255,255,255,0.2)',
  },
  transcriptContainer: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  userText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
  },
  userLabel: {
    color: 'rgba(255,255,255,0.2)',
  },
  aiText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textAlign: 'center',
  },
  aiLabel: {
    color: 'rgba(255,255,255,0.2)',
  },
});
