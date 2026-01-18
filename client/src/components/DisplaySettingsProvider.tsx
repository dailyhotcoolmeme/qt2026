import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type FontFamily = "sans-serif" | "serif" | "monospace";

interface DisplaySettingsContextType {
  fontSize: number;
  fontFamily: FontFamily;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  setFontFamily: (font: FontFamily) => void;
}

const DisplaySettingsContext = createContext<DisplaySettingsContextType | undefined>(undefined);

const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 24;
const DEFAULT_FONT_SIZE = 13;

export function DisplaySettingsProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bibleapp-fontsize');
      return saved ? parseInt(saved, 10) : DEFAULT_FONT_SIZE;
    }
    return DEFAULT_FONT_SIZE;
  });
  const [fontFamily, setFontFamily] = useState<FontFamily>("sans-serif");

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
    localStorage.setItem('bibleapp-fontsize', fontSize.toString());
  }, [fontSize]);

  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 1, MAX_FONT_SIZE));
  };

  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 1, MIN_FONT_SIZE));
  };

  return (
    <DisplaySettingsContext.Provider value={{ fontSize, fontFamily, increaseFontSize, decreaseFontSize, setFontFamily }}>
      {children}
    </DisplaySettingsContext.Provider>
  );
}

export function useDisplaySettings() {
  const context = useContext(DisplaySettingsContext);
  if (!context) {
    throw new Error("useDisplaySettings must be used within a DisplaySettingsProvider");
  }
  return context;
}
