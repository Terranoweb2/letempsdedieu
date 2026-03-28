import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

interface UsageLimitModalProps {
  visible: boolean;
  onClose: () => void;
  resetTime: string;
}

export const UsageLimitModal: React.FC<UsageLimitModalProps> = ({
  visible,
  onClose,
  resetTime,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, fadeAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={56} color={Colors.gold500} />
          </View>

          <Text style={styles.title}>Limite quotidienne atteinte</Text>

          <Text style={styles.message}>
            Vous avez utilise vos 20 messages gratuits aujourd'hui. Revenez
            demain !
          </Text>

          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <View style={styles.progressBarFill} />
            </View>
            <Text style={styles.progressText}>20/20 utilises</Text>
          </View>

          <View style={styles.resetContainer}>
            <Ionicons name="time-outline" size={16} color={Colors.gray400} />
            <Text style={styles.resetText}>Reinitialisation a minuit</Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>OK</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.navy800,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.whiteBorder20,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: Colors.gray400,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 16,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: Colors.whiteBorder10,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    width: '100%',
    backgroundColor: '#ef4444',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: Colors.gray500,
    textAlign: 'center',
  },
  resetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  resetText: {
    fontSize: 13,
    color: Colors.gray400,
  },
  button: {
    backgroundColor: Colors.teal500,
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
