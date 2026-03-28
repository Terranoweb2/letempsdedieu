import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '../theme/colors';

export interface UsageBadgeProps {
  used: number;
  limit: number;
}

function getColor(remaining: number): string {
  if (remaining > 10) return '#22c55e'; // green
  if (remaining >= 5) return '#f59e0b'; // orange
  return '#ef4444'; // red
}

export const UsageBadge: React.FC<UsageBadgeProps> = ({ used, limit }) => {
  const remaining = Math.max(0, limit - used);
  const color = getColor(remaining);
  const progress = used / limit; // 0 to 1
  const atLimit = remaining <= 0;

  const handlePress = () => {
    Alert.alert(
      'Utilisation quotidienne',
      `Messages envoyes : ${used}/${limit}\nRestants : ${remaining}\nPlan : Gratuit\nReinitialisation : a minuit`,
      [{ text: 'OK' }]
    );
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {atLimit ? (
        <Text style={[styles.limitText, { color: '#ef4444' }]}>Limite</Text>
      ) : (
        <>
          <View style={styles.progressRing}>
            <View
              style={[
                styles.progressBackground,
                { borderColor: Colors.whiteBorder10 },
              ]}
            />
            <View
              style={[
                styles.progressFill,
                {
                  borderColor: color,
                  borderTopColor: progress > 0.25 ? color : 'transparent',
                  borderRightColor: progress > 0.5 ? color : 'transparent',
                  borderBottomColor: progress > 0.75 ? color : 'transparent',
                  borderLeftColor: progress > 0 ? color : 'transparent',
                  transform: [{ rotate: '-90deg' }],
                },
              ]}
            />
          </View>
          <Text style={[styles.text, { color }]}>
            {used}/{limit}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.whiteBorder05,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.whiteBorder10,
    gap: 4,
    marginRight: 8,
  },
  progressRing: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBackground: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  progressFill: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
  limitText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
