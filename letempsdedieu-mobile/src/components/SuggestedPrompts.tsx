import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

interface SuggestedPromptsProps {
  onSelectPrompt: (text: string) => void;
}

const PROMPTS: { text: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { text: "Quelles sont les preuves de l'existence de Dieu ?", icon: 'book-outline' },
  { text: 'Explique-moi les differences entre les grandes religions', icon: 'earth-outline' },
  { text: "Que dit la Bible sur l'amour ?", icon: 'heart-outline' },
  { text: 'Analyse les contradictions du Coran', icon: 'search-outline' },
  { text: 'Qui est Jesus-Christ selon les Ecritures ?', icon: 'person-outline' },
  { text: 'Comment prier efficacement ?', icon: 'hand-left-outline' },
];

export const SuggestedPrompts: React.FC<SuggestedPromptsProps> = ({
  onSelectPrompt,
}) => {
  return (
    <View style={styles.container}>
      {[0, 1, 2].map((row) => (
        <View key={row} style={styles.row}>
          {PROMPTS.slice(row * 2, row * 2 + 2).map((prompt) => (
            <TouchableOpacity
              key={prompt.text}
              style={styles.card}
              onPress={() => onSelectPrompt(prompt.text)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={prompt.icon}
                size={18}
                color={Colors.teal500}
                style={styles.icon}
              />
              <Text style={styles.text} numberOfLines={3}>
                {prompt.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    paddingHorizontal: 8,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.navy900,
    borderWidth: 1,
    borderColor: Colors.whiteBorder10,
    borderRadius: 14,
    padding: 14,
  },
  icon: {
    marginBottom: 8,
  },
  text: {
    color: Colors.gray200,
    fontSize: 13,
    lineHeight: 18,
  },
});
