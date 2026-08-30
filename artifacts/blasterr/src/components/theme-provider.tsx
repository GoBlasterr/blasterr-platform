import { useUser } from "@clerk/react";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

type Theme = "dark" | "light";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const guestThemeKey = "blasterr-theme:guest";

function getStoredTheme(key: string): Theme {
  try {
    return window.localStorage.getItem(key) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const storageKey = useMemo(
    () => user?.id ? `blasterr-theme:${user.id}` : guestThemeKey,
    [user?.id],
  );
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme(guestThemeKey));

  useEffect(() => {
    setTheme(getStoredTheme(storageKey));
  }, [storageKey]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    root.style.colorScheme = theme;
    try {
      window.localStorage.setItem(storageKey, theme);
    } catch {
      // Theme still applies for this session when storage is unavailable.
    }
  }, [storageKey, theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return context;
}