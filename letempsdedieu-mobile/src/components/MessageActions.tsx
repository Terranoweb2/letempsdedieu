import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

interface MessageActionsProps {
  content: string;
  isLastAssistant: boolean;
  onRetry?: () => void;
  onDismiss: () => void;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  content,
  isLastAssistant,
  onRetry,
  onDismiss,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(content);
    onDismiss();
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: content });
    } catch (_) {
      // user cancelled
    }
    onDismiss();
  };

  const handleRetry = () => {
    onRetry?.();
    onDismiss();
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
        <Ionicons name="copy-outline" size={18} color={Colors.gray200} />
        <Text style={styles.actionLabel}>Copier</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
        <Ionicons name="share-outline" size={18} color={Colors.gray200} />
        <Text style={styles.actionLabel}>Partager</Text>
      </TouchableOpacity>

      {isLastAssistant && onRetry && (
        <TouchableOpacity style={styles.actionButton} onPress={handleRetry}>
          <Ionicons name="refresh-outline" size={18} color={Colors.gray200} />
          <Text style={styles.actionLabel}>Relancer</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.navy800,
    borderWidth: 1,
    borderColor: Colors.whiteBorder20,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignSelf: 'center',
    marginBottom: 4,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  actionLabel: {
    color: Colors.gray300,
    fontSize: 10,
    marginTop: 2,
  },
});
