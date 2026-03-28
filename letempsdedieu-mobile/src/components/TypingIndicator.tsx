import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Colors } from '../theme/colors';

const DOT_SIZE = 9;
const BOUNCE_HEIGHT = -8;
const DURATION = 350;

const BouncingDot: React.FC<{ delay: number }> = ({ delay }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: BOUNCE_HEIGHT,
            duration: DURATION,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: DURATION,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration: DURATION,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.4,
            duration: DURATION,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.dot,
        { transform: [{ translateY }], opacity },
      ]}
    />
  );
};

const LABELS = [
  { delay: 1000, text: 'En train de reflechir...' },
  { delay: 5000, text: 'Presque pret...' },
  { delay: 10000, text: 'Ca prend plus de temps que prevu...' },
];

export const TypingIndicator: React.FC = () => {
  const [labelText, setLabelText] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timers = LABELS.map(({ delay, text }) =>
      setTimeout(() => {
        setLabelText(text);
        // Fade in the new label
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>AI</Text>
      </View>
      <View style={styles.rightColumn}>
        <View style={styles.bubble}>
          <BouncingDot delay={0} />
          <BouncingDot delay={130} />
          <BouncingDot delay={260} />
        </View>
        {labelText && (
          <Animated.Text style={[styles.labelText, { opacity: fadeAnim }]}>
            {labelText}
          </Animated.Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    marginHorizontal: 12,
    alignItems: 'flex-start',
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
  avatarText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  rightColumn: {
    marginLeft: 8,
    flexShrink: 1,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navy900,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.whiteBorder10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: Colors.teal500,
  },
  labelText: {
    color: Colors.gray500,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 6,
    marginLeft: 4,
  },
});
