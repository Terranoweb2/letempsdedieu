import * as Haptics from 'expo-haptics';

/**
 * Light impact feedback - for button taps
 */
export const lightImpact = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

/**
 * Medium impact feedback - for sending messages
 */
export const mediumImpact = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

/**
 * Success notification feedback - for successful actions
 */
export const successNotification = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

/**
 * Selection changed feedback - for selection changes
 */
export const selectionChanged = () => {
  Haptics.selectionAsync();
};
