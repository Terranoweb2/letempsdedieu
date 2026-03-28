import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { UsageBadge } from './UsageBadge';

export type ModelSpeed = 'fast' | 'medium' | 'slow';

export interface ModelOption {
  id: string;
  label: string;
  speed: ModelSpeed;
}

const SPEED_META: Record<ModelSpeed, { color: string; label: string }> = {
  fast: { color: '#22c55e', label: 'Rapide' },
  medium: { color: '#f59e0b', label: 'Moyen' },
  slow: { color: '#ef4444', label: 'Lent' },
};

export const AVAILABLE_MODELS: ModelOption[] = [
  // Fast models first
  { id: 'openai/gpt-5.4-nano', label: 'GPT-5.4 Nano', speed: 'fast' },
  { id: 'z-ai/glm-5-turbo', label: 'GLM-5 Turbo', speed: 'fast' },
  { id: 'minimax/minimax-m2.7', label: 'MiniMax M2.7', speed: 'fast' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 (Free)', speed: 'fast' },
  // Medium models
  { id: 'openai/gpt-4o', label: 'GPT-4o', speed: 'medium' },
  { id: 'x-ai/grok-4.20-beta', label: 'Grok 4.20 Beta', speed: 'medium' },
  // Slow models
  { id: 'anthropic/claude-opus-4-20250514', label: 'Claude Opus 4.6', speed: 'slow' },
];

export interface HeaderProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  onMenuPress: () => void;
  usageUsed?: number;
  usageLimit?: number;
}

export const Header: React.FC<HeaderProps> = ({
  selectedModel,
  onModelChange,
  onMenuPress,
  usageUsed,
  usageLimit,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const currentModel = AVAILABLE_MODELS.find((m) => m.id === selectedModel);

  const handleSelectModel = (modelId: string) => {
    onModelChange(modelId);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
        <Ionicons name="menu" size={24} color={Colors.white} />
      </TouchableOpacity>

      <View style={styles.titleContainer}>
        <Text style={styles.titleTeal}>Le Temps </Text>
        <Text style={styles.titleGold}>de Dieu</Text>
      </View>

      {usageUsed != null && usageLimit != null && (
        <UsageBadge used={usageUsed} limit={usageLimit} />
      )}

      <TouchableOpacity
        style={styles.modelSelector}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.modelText} numberOfLines={1}>
          {currentModel?.label || 'Select Model'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.teal500} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choisir un modele</Text>
            <FlatList
              data={AVAILABLE_MODELS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const speedInfo = SPEED_META[item.speed];
                return (
                  <TouchableOpacity
                    style={[
                      styles.modelItem,
                      item.id === selectedModel && styles.modelItemActive,
                    ]}
                    onPress={() => handleSelectModel(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modelItemLeft}>
                      <Text
                        style={[
                          styles.modelItemText,
                          item.id === selectedModel && styles.modelItemTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                      <View style={styles.speedBadge}>
                        <View
                          style={[
                            styles.speedDot,
                            { backgroundColor: speedInfo.color },
                          ]}
                        />
                        <Text
                          style={[
                            styles.speedLabel,
                            { color: speedInfo.color },
                          ]}
                        >
                          {speedInfo.label}
                        </Text>
                      </View>
                    </View>
                    {item.id === selectedModel && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={Colors.teal500}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.navy950,
    borderBottomWidth: 1,
    borderBottomColor: Colors.whiteBorder10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  menuButton: {
    padding: 4,
    marginRight: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleTeal: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.teal500,
  },
  titleGold: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.gold500,
  },
  modelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navy800,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.whiteBorder20,
    maxWidth: 160,
    gap: 4,
  },
  modelText: {
    color: Colors.gray300,
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.navy800,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 340,
    maxHeight: 480,
    borderWidth: 1,
    borderColor: Colors.whiteBorder20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  modelItemActive: {
    backgroundColor: Colors.whiteBorder10,
  },
  modelItemText: {
    color: Colors.gray300,
    fontSize: 15,
    fontWeight: '500',
  },
  modelItemTextActive: {
    color: Colors.teal500,
    fontWeight: '600',
  },
  modelItemLeft: {
    flex: 1,
    marginRight: 8,
  },
  speedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  speedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  speedLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});
