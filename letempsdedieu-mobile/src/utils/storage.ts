import AsyncStorage from '@react-native-async-storage/async-storage';
import { Conversation, DisplayMessage } from '../screens/ChatScreen';

const CONVERSATIONS_KEY = '@ltdd_conversations';
const SELECTED_MODEL_KEY = '@ltdd_selected_model';
const PINNED_IDS_KEY = '@ltdd_pinned';

// Debounce timer for saving conversations
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Saves conversations to AsyncStorage (debounced, 500ms).
 * Strips isStreaming from messages before saving.
 */
export function saveConversations(conversations: Conversation[]): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(async () => {
    try {
      // Strip isStreaming: true from all messages
      const cleaned = conversations.map((conv) => ({
        ...conv,
        messages: conv.messages.map((msg) => ({
          ...msg,
          isStreaming: false,
        })),
      }));
      await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(cleaned));
    } catch (error) {
      console.warn('Failed to save conversations:', error);
    }
  }, 500);
}

/**
 * Loads conversations from AsyncStorage.
 */
export async function loadConversations(): Promise<Conversation[]> {
  try {
    const json = await AsyncStorage.getItem(CONVERSATIONS_KEY);
    if (json) {
      return JSON.parse(json) as Conversation[];
    }
  } catch (error) {
    console.warn('Failed to load conversations:', error);
  }
  return [];
}

/**
 * Saves the selected model ID to AsyncStorage.
 */
export async function saveSelectedModel(modelId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(SELECTED_MODEL_KEY, modelId);
  } catch (error) {
    console.warn('Failed to save selected model:', error);
  }
}

/**
 * Loads the last selected model ID from AsyncStorage.
 */
export async function loadSelectedModel(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SELECTED_MODEL_KEY);
  } catch (error) {
    console.warn('Failed to load selected model:', error);
  }
  return null;
}

/**
 * Saves pinned conversation IDs to AsyncStorage.
 */
export async function savePinnedIds(ids: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(PINNED_IDS_KEY, JSON.stringify([...ids]));
  } catch (error) {
    console.warn('Failed to save pinned IDs:', error);
  }
}

/**
 * Loads pinned conversation IDs from AsyncStorage.
 */
export async function loadPinnedIds(): Promise<Set<string>> {
  try {
    const json = await AsyncStorage.getItem(PINNED_IDS_KEY);
    if (json) {
      return new Set(JSON.parse(json) as string[]);
    }
  } catch (error) {
    console.warn('Failed to load pinned IDs:', error);
  }
  return new Set();
}

const THEME_KEY = '@ltdd_theme';

/**
 * Saves the user's theme preference to AsyncStorage.
 */
export async function saveTheme(theme: string): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    console.warn('Failed to save theme:', error);
  }
}

/**
 * Loads the user's theme preference from AsyncStorage.
 */
export async function loadTheme(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(THEME_KEY);
  } catch (error) {
    console.warn('Failed to load theme:', error);
  }
  return null;
}

const USAGE_KEY = '@ltdd_usage';

/**
 * Saves usage data to AsyncStorage.
 */
export async function saveUsage(data: {
  used: number;
  limit: number;
  remaining: number;
  plan: 'free' | 'pro';
  resetDate: string;
}): Promise<void> {
  try {
    await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save usage:', error);
  }
}

/**
 * Loads usage data from AsyncStorage.
 */
export async function loadUsage(): Promise<{
  used: number;
  limit: number;
  remaining: number;
  plan: 'free' | 'pro';
  resetDate: string;
} | null> {
  try {
    const json = await AsyncStorage.getItem(USAGE_KEY);
    if (json) {
      return JSON.parse(json);
    }
  } catch (error) {
    console.warn('Failed to load usage:', error);
  }
  return null;
}

const CHAT_MODE_KEY = '@ltdd_chat_mode';

/**
 * Saves the selected chat mode to AsyncStorage.
 */
export async function saveChatMode(mode: string): Promise<void> {
  try {
    await AsyncStorage.setItem(CHAT_MODE_KEY, mode);
  } catch (error) {
    console.warn('Failed to save chat mode:', error);
  }
}

/**
 * Loads the selected chat mode from AsyncStorage.
 */
export async function loadChatMode(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(CHAT_MODE_KEY);
  } catch (error) {
    console.warn('Failed to load chat mode:', error);
  }
  return null;
}

const ONBOARDING_KEY = '@ltdd_onboarding_done';

/**
 * Checks if onboarding has been completed.
 */
export async function isOnboardingDone(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === 'true';
  } catch (error) {
    console.warn('Failed to check onboarding status:', error);
  }
  return false;
}

/**
 * Marks onboarding as completed.
 */
export async function setOnboardingDone(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  } catch (error) {
    console.warn('Failed to save onboarding status:', error);
  }
}
