import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { useColorScheme } from 'react-native';
import { DarkColors, LightColors, ThemeColors } from './colors';
import { saveTheme, loadTheme } from '../utils/storage';

type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemePreference;
  colors: ThemeColors;
  setTheme: (theme: ThemePreference) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  colors: DarkColors,
  setTheme: () => {},
  isDark: true,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemePreference>('dark');
  const [loaded, setLoaded] = useState(false);

  // Load persisted theme on mount
  useEffect(() => {
    (async () => {
      const saved = await loadTheme();
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemeState(saved);
      }
      setLoaded(true);
    })();
  }, []);

  const setTheme = useCallback((newTheme: ThemePreference) => {
    setThemeState(newTheme);
    saveTheme(newTheme);
  }, []);

  const isDark = useMemo(() => {
    if (theme === 'system') {
      return systemColorScheme !== 'light';
    }
    return theme === 'dark';
  }, [theme, systemColorScheme]);

  const colors = useMemo(() => {
    return isDark ? DarkColors : LightColors;
  }, [isDark]);

  const value = useMemo(
    () => ({ theme, colors, setTheme, isDark }),
    [theme, colors, setTheme, isDark]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  return context;
};
