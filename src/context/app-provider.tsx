/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useEffect, useState } from "react";

export type TLanguage = "en" | "vi";
export type TTheme = "dark" | "light" | "system";
export type TColorTheme = "default" | "blue" | "green" | "purple" | "orange" | "rose" | "cyan" | "custom";
export type TLayoutMode = "sidebar" | "compact" | "header" | "floating";

type AppProviderProps = {
  children: React.ReactNode;
  defaultTheme?: TTheme;
};

type AppHeaderState = {
  language: TLanguage;
  isOpenMenu: boolean;
  isMobileMenuOpen: boolean;
  theme: TTheme;
  colorTheme: TColorTheme;
  customAccentHex: string;
  layoutMode: TLayoutMode;
  setLanguage: (language: TLanguage) => void;
  setOpenMenu: (isOpen: boolean) => void;
  setMobileMenuOpen: (isOpen: boolean) => void;
  setTheme: (theme: TTheme) => void;
  setColorTheme: (colorTheme: TColorTheme) => void;
  setCustomAccentHex: (hex: string) => void;
  setLayoutMode: (mode: TLayoutMode) => void;
};

const initialState: AppHeaderState = {
  language: "en",
  isOpenMenu: false,
  isMobileMenuOpen: false,
  theme: "system",
  colorTheme: "default",
  customAccentHex: "#3b82f6",
  layoutMode: "sidebar",
  setLanguage: () => null,
  setOpenMenu: () => null,
  setMobileMenuOpen: () => null,
  setTheme: () => null,
  setColorTheme: () => null,
  setCustomAccentHex: () => null,
  setLayoutMode: () => null,
};

const AppProviderContext = createContext<AppHeaderState>(initialState);

/** Chuyển hex (#rrggbb) sang chuỗi "H S% L%" dùng được trong CSS variables */
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const PRESET_CLASSES: TColorTheme[] = ["blue", "green", "purple", "orange", "rose", "cyan"];

export function AppProvider({
  children,
  defaultTheme = "system",
  ...props
}: AppProviderProps) {

  const [language, setLanguage] = useState<TLanguage>(
    () => (localStorage.getItem("LANGUAGE") as TLanguage) || "en",
  );
  const [isOpenMenu, setOpenMenu] = useState<boolean>(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<TTheme>(
    () => (localStorage.getItem("THEME") as TTheme) || defaultTheme,
  );
  const [colorTheme, setColorTheme] = useState<TColorTheme>(
    () => (localStorage.getItem("COLOR_THEME") as TColorTheme) || "default",
  );
  const [customAccentHex, setCustomAccentHex] = useState<string>(
    () => localStorage.getItem("CUSTOM_ACCENT_HEX") || "#3b82f6",
  );
  const [layoutMode, setLayoutMode] = useState<TLayoutMode>(
    () => (localStorage.getItem("LAYOUT_MODE") as TLayoutMode) || "sidebar",
  );

  // Apply dark/light/system theme
  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = (t: TTheme) => {
      root.classList.remove("light", "dark");
      const systemTheme = mediaQuery.matches ? "dark" : "light";
      root.classList.add(t === "system" ? systemTheme : t);
    };
    const handleChange = () => { if (theme === "system") applyTheme("system"); };
    applyTheme(theme);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // Apply color theme preset class hoặc custom CSS variables
  useEffect(() => {
    const root = window.document.documentElement;
    // Xoá tất cả preset classes cũ
    PRESET_CLASSES.forEach(c => root.classList.remove(`theme-${c}`));

    if (colorTheme === "custom") {
      const hsl = hexToHsl(customAccentHex);
      root.style.setProperty("--primary", hsl);
      root.style.setProperty("--ring", hsl);
      const l = parseFloat(hsl.split(" ")[2]);
      root.style.setProperty("--primary-foreground", l > 60 ? "222.2 84% 4.9%" : "210 40% 98%");
    } else {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--primary-foreground");
      if (colorTheme !== "default") {
        root.classList.add(`theme-${colorTheme}`);
      }
    }
  }, [colorTheme, customAccentHex]);

  const value: AppHeaderState = {
    language,
    isOpenMenu,
    isMobileMenuOpen,
    theme,
    colorTheme,
    customAccentHex,
    layoutMode,
    setLanguage: (lang) => { localStorage.setItem("LANGUAGE", lang); setLanguage(lang); },
    setTheme: (t) => { localStorage.setItem("THEME", t); setTheme(t); },
    setColorTheme: (c) => { localStorage.setItem("COLOR_THEME", c); setColorTheme(c); },
    setCustomAccentHex: (hex) => {
      localStorage.setItem("CUSTOM_ACCENT_HEX", hex);
      localStorage.setItem("COLOR_THEME", "custom");
      setCustomAccentHex(hex);
      setColorTheme("custom");
    },
    setLayoutMode: (mode) => { localStorage.setItem("LAYOUT_MODE", mode); setLayoutMode(mode); },
    setOpenMenu: (isOpen) => setOpenMenu(isOpen),
    setMobileMenuOpen: (isOpen) => setMobileMenuOpen(isOpen),
  };

  return (
    <AppProviderContext.Provider {...props} value={value}>
      {children}
    </AppProviderContext.Provider>
  );
}

export const useAppState = () => {
  const context = useContext(AppProviderContext);
  if (context === undefined)
    throw new Error("useAppState must be used within a AppProvider");
  return context;
};
