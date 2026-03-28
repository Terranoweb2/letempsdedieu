// ========== Dark Theme (original) ==========
export const DarkColors = {
  // Navy backgrounds
  navy950: '#060b18',
  navy900: '#0a1025',
  navy800: '#111827',
  navy700: '#1e293b',

  // Teal accents
  teal700: '#0d7377',
  teal600: '#0f766e',
  teal500: '#14b8a6',
  teal400: '#2dd4bf',

  // Gold accents
  gold500: '#c4a35a',
  gold400: '#d4b76a',
  gold300: '#e4cb8a',

  // Neutrals
  white: '#ffffff',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',

  // Borders
  whiteBorder10: 'rgba(255, 255, 255, 0.1)',
  whiteBorder20: 'rgba(255, 255, 255, 0.2)',
  whiteBorder05: 'rgba(255, 255, 255, 0.05)',

  // Transparent
  transparent: 'transparent',
} as const;

// ========== Types ==========
export type ThemeColors = typeof DarkColors;
export type ColorKey = keyof ThemeColors;

// ========== Light Theme ==========
export const LightColors: ThemeColors = {
  // Backgrounds (white/light grays instead of navy)
  navy950: '#ffffff',
  navy900: '#f8f9fa',
  navy800: '#f1f3f5',
  navy700: '#e9ecef',

  // Teal accents (brand colors - stay the same)
  teal700: '#0d7377',
  teal600: '#0f766e',
  teal500: '#14b8a6',
  teal400: '#2dd4bf',

  // Gold accents (brand colors - stay the same)
  gold500: '#c4a35a',
  gold400: '#d4b76a',
  gold300: '#e4cb8a',

  // Neutrals (inverted for light backgrounds)
  white: '#111827',
  gray100: '#1f2937',
  gray200: '#374151',
  gray300: '#4b5563',
  gray400: '#6b7280',
  gray500: '#9ca3af',
  gray600: '#d1d5db',
  gray700: '#e5e7eb',
  gray800: '#f3f4f6',

  // Borders (dark borders for light backgrounds)
  whiteBorder10: 'rgba(0, 0, 0, 0.1)',
  whiteBorder20: 'rgba(0, 0, 0, 0.2)',
  whiteBorder05: 'rgba(0, 0, 0, 0.05)',

  // Transparent
  transparent: 'transparent',
} as const;

// ========== Backward compatibility ==========
export const Colors = DarkColors;
