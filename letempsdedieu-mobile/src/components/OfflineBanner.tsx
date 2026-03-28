import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';

export const OfflineBanner: React.FC = () => {
  const netInfo = useNetInfo();
  const translateY = useRef(new Animated.Value(-36)).current;

  const isOffline =
    netInfo.isConnected !== null && netInfo.isConnected === false;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: isOffline ? 0 : -36,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline]);

  if (netInfo.isConnected === null) {
    return null;
  }

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      <Ionicons
        name="cloud-offline-outline"
        size={16}
        color="#ffffff"
        style={styles.icon}
      />
      <Text style={styles.text}>Pas de connexion internet</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 36,
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
