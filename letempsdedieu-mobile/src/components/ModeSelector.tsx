import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { ChatMode } from '../utils/systemPrompts';

interface ModeSelectorProps {
  selectedMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

const MODES: { key: ChatMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'discussion', label: 'Discussion', icon: 'chatbubble-outline' },
  { key: 'etude', label: 'Etude biblique', icon: 'book-outline' },
  { key: 'apologetique', label: 'Apologetique', icon: 'shield-outline' },
];

export const ModeSelector: React.FC<ModeSelectorProps> = ({ selectedMode, onModeChange }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {MODES.map((mode) => {
        const isActive = selectedMode === mode.key;
        return (
          <TouchableOpacity
            key={mode.key}
            style={[styles.pill, isActive ? styles.pillActive : styles.pillInactive]}
            onPress={() => onModeChange(mode.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={mode.icon}
              size={16}
              color={isActive ? Colors.white : Colors.gray400}
            />
            <Text style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}>
              {mode.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    gap: 6,
  },
  pillActive: {
    backgroundColor: Colors.teal500,
  },
  pillInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.whiteBorder10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelActive: {
    color: Colors.white,
  },
  labelInactive: {
    color: Colors.gray400,
  },
});
