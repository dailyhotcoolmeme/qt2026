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

  const [fontFamily, setFontFamily] = useState<FontFamily>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bibleapp-fontfamily');
      return (saved as FontFamily) || "sans-serif";
    }
    return "sans-serif";
  });

  // 1. 폰트 크기 적용
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
    localStorage.setItem('bibleapp-fontsize', fontSize.toString());
  }, [fontSize]);

  // 2. 폰트 종류 적용 (이름 매핑 로직 포함)
  useEffect(() => {
    let realFontName = "";
    if (fontFamily === "sans-serif") {
      realFontName = "'Noto Sans KR', sans-serif";
    } else if (fontFamily === "serif") {
      realFontName = "'Nanum Myeongjo', serif";
    } else if (fontFamily === "monospace") {
      realFontName = "'Nanum Gothic', monospace";
    }
    
    document.body.style.fontFamily = realFontName;
    localStorage.setItem('bibleapp-fontfamily', fontFamily);
  }, [fontFamily]);

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
