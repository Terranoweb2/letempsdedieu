import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  FlatList,
  Pressable,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { Conversation } from './ChatScreen';
import { AVAILABLE_MODELS } from '../components/Header';
import { shareConversation } from '../utils/exportConversation';

export interface SettingsScreenProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  conversations: Conversation[];
  onClearAllConversations: () => void;
}

export const SettingsScreen: React.FC<
  SettingsScreenProps & { navigation: any }
> = ({
  selectedModel,
  onModelChange,
  conversations,
  onClearAllConversations,
  navigation,
}) => {
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const { theme, setTheme, colors } = useTheme();

  const themeOptions: { value: 'light' | 'dark' | 'system'; label: string }[] = [
    { value: 'dark', label: 'Sombre' },
    { value: 'light', label: 'Clair' },
    { value: 'system', label: 'Systeme' },
  ];

  const currentModel = AVAILABLE_MODELS.find((m) => m.id === selectedModel);

  const storageInfo = useMemo(() => {
    const json = JSON.stringify(conversations);
    const bytes = new Blob([json]).size;
    let sizeLabel: string;
    if (bytes < 1024) {
      sizeLabel = `${bytes} o`;
    } else if (bytes < 1024 * 1024) {
      sizeLabel = `${(bytes / 1024).toFixed(1)} Ko`;
    } else {
      sizeLabel = `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
    }
    return { count: conversations.length, size: sizeLabel };
  }, [conversations]);

  const handleExport = () => {
    if (conversations.length === 0) {
      Alert.alert('Exporter', 'Aucune conversation a exporter.');
      return;
    }

    Alert.alert(
      'Exporter les conversations',
      `${conversations.length} conversation${conversations.length > 1 ? 's' : ''} disponible${conversations.length > 1 ? 's' : ''}`,
      [
        {
          text: 'Partager en texte',
          onPress: async () => {
            // Combine all conversations into one text and share
            const allText = conversations
              .map((conv) => {
                const date = new Date(conv.createdAt).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const msgs = conv.messages
                  .map((m) => {
                    const label = m.role === 'user' ? '[Vous]' : '[Assistant IA]';
                    return `${label}: ${m.content}`;
                  })
                  .join('\n\n');
                return `${'='.repeat(32)}\n${conv.title}\nDate: ${date}\n${'='.repeat(32)}\n\n${msgs}`;
              })
              .join('\n\n\n');

            const fullText = `Le Temps de Dieu - Toutes les conversations\n${'='.repeat(44)}\n\n${allText}\n\n---\nExporte depuis Le Temps de Dieu - voietv.org`;

            try {
              await import('react-native').then(({ Share }) =>
                Share.share({
                  title: 'Le Temps de Dieu - Conversations',
                  message: fullText,
                })
              );
            } catch (_e) {
              // User cancelled sharing
            }
          },
        },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Supprimer toutes les conversations',
      'Cette action est irreversible. Toutes vos conversations seront supprimees.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: onClearAllConversations,
        },
      ]
    );
  };

  const handleSelectModel = (modelId: string) => {
    onModelChange(modelId);
    setModelPickerVisible(false);
  };

  const handleOpenWebsite = () => {
    Linking.openURL('https://voietv.org');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Parametres</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Section: Theme */}
        <Text style={styles.sectionHeader}>THEME</Text>
        <View style={styles.section}>
          {themeOptions.map((option, index) => (
            <React.Fragment key={option.value}>
              {index > 0 && <View style={styles.rowSeparator} />}
              <TouchableOpacity
                style={styles.row}
                onPress={() => setTheme(option.value)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.radioOuter,
                  theme === option.value && styles.radioOuterActive,
                ]}>
                  {theme === option.value && <View style={styles.radioInner} />}
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>{option.label}</Text>
                </View>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* Section 1: Modele IA */}
        <Text style={styles.sectionHeader}>MODELE IA PAR DEFAUT</Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => setModelPickerVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="hardware-chip-outline"
              size={20}
              color={Colors.teal500}
            />
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Modele actuel</Text>
              <Text style={styles.rowValue}>
                {currentModel?.label || 'Non selectionne'}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={Colors.gray500}
            />
          </TouchableOpacity>
        </View>

        {/* Section 2: Conversations */}
        <Text style={styles.sectionHeader}>CONVERSATIONS</Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.row}
            onPress={handleExport}
            activeOpacity={0.7}
          >
            <Ionicons
              name="download-outline"
              size={20}
              color={Colors.teal500}
            />
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Exporter les conversations</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={Colors.gray500}
            />
          </TouchableOpacity>

          <View style={styles.rowSeparator} />

          <TouchableOpacity
            style={styles.row}
            onPress={handleClearAll}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, styles.dangerText]}>
                Supprimer toutes les conversations
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={Colors.gray500}
            />
          </TouchableOpacity>
        </View>

        {/* Section 3: A propos */}
        <Text style={styles.sectionHeader}>A PROPOS</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={Colors.teal500}
            />
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Version</Text>
              <Text style={styles.rowValue}>1.0.0</Text>
            </View>
          </View>

          <View style={styles.rowSeparator} />

          <View style={styles.row}>
            <Ionicons name="book-outline" size={20} color={Colors.teal500} />
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Le Temps de Dieu</Text>
              <Text style={styles.rowDescription}>
                Explorez la sagesse divine avec l'aide de l'intelligence
                artificielle.
              </Text>
            </View>
          </View>

          <View style={styles.rowSeparator} />

          <View style={styles.row}>
            <Ionicons name="heart-outline" size={20} color={Colors.teal500} />
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Propulse par VoieTV.org</Text>
            </View>
          </View>

          <View style={styles.rowSeparator} />

          <TouchableOpacity
            style={styles.row}
            onPress={handleOpenWebsite}
            activeOpacity={0.7}
          >
            <Ionicons name="globe-outline" size={20} color={Colors.teal500} />
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Site web</Text>
              <Text style={styles.rowValue}>voietv.org</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={Colors.gray500}
            />
          </TouchableOpacity>
        </View>

        {/* Section 4: Stockage */}
        <Text style={styles.sectionHeader}>STOCKAGE</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <Ionicons
              name="chatbubbles-outline"
              size={20}
              color={Colors.teal500}
            />
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Conversations enregistrees</Text>
              <Text style={styles.rowValue}>{storageInfo.count}</Text>
            </View>
          </View>

          <View style={styles.rowSeparator} />

          <View style={styles.row}>
            <Ionicons
              name="server-outline"
              size={20}
              color={Colors.teal500}
            />
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Espace utilise (estime)</Text>
              <Text style={styles.rowValue}>{storageInfo.size}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Model picker modal */}
      <Modal
        visible={modelPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModelPickerVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModelPickerVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choisir un modele</Text>
            <FlatList
              data={AVAILABLE_MODELS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modelItem,
                    item.id === selectedModel && styles.modelItemActive,
                  ]}
                  onPress={() => handleSelectModel(item.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.modelItemText,
                      item.id === selectedModel && styles.modelItemTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.id === selectedModel && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={Colors.teal500}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy950,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.whiteBorder10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray500,
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    backgroundColor: Colors.navy900,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.whiteBorder10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.gray100,
  },
  rowValue: {
    fontSize: 13,
    color: Colors.gray400,
    marginTop: 2,
  },
  rowDescription: {
    fontSize: 13,
    color: Colors.gray500,
    marginTop: 4,
    lineHeight: 18,
  },
  rowSeparator: {
    height: 1,
    backgroundColor: Colors.whiteBorder10,
    marginLeft: 46,
  },
  dangerText: {
    color: '#ef4444',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.gray500,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: Colors.teal500,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.teal500,
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
    maxHeight: 420,
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
});
