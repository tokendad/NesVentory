import React, { createContext, useContext, useEffect, useState } from "react";
import {
  type ThemeConfig,
  type ThemeMode,
  type ColorPalette,
  getThemeConfig,
  saveThemeConfig,
  applyTheme,
  getSystemPrefersDark,
  DEFAULT_THEME,
} from "../lib/theme";

interface ThemeContextValue {
  config: ThemeConfig;
  setMode: (mode: ThemeMode) => void;
  setColorPalette: (palette: ColorPalette) => void;
  setConfig: (config: ThemeConfig) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfigState] = useState<ThemeConfig>(() => getThemeConfig());
  const [systemDark, setSystemDark] = useState(() => getSystemPrefersDark());

  // Watch for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemDark(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Apply theme whenever config or system preference changes
  useEffect(() => {
    applyTheme(config);
  }, [config, systemDark]);

  const setConfig = (newConfig: ThemeConfig) => {
    saveThemeConfig(newConfig);
    setConfigState(newConfig);
  };

  const setMode = (mode: ThemeMode) => {
    setConfig({ ...config, mode });
  };

  const setColorPalette = (colorPalette: ColorPalette) => {
    setConfig({ ...config, colorPalette });
  };

  // Calculate if we're currently in dark mode
  const isDark = config.mode === "system" ? systemDark : config.mode === "dark";

  return (
    <ThemeContext.Provider value={{ config, setMode, setColorPalette, setConfig, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return a default value if not within provider (for backwards compatibility)
    return {
      config: DEFAULT_THEME,
      setMode: () => {},
      setColorPalette: () => {},
      setConfig: () => {},
      isDark: true,
    };
  }
  return context;
}
