import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type FontFamily = "sans-serif" | "serif" | "monospace";

interface DisplaySettingsContextType {
  fontSize: number;
  setFontSize: (size: number) => void; // 이 줄 추가
  fontFamily: FontFamily;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  setFontFamily: (font: FontFamily) => void;
}

const DisplaySettingsContext = createContext<DisplaySettingsContextType | undefined>(undefined);

const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 24;
const DEFAULT_FONT_SIZE = 16;

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

      // 2. 폰트 종류 적용 (이름 매핑 수정)
  useEffect(() => {
    let realFontName = "";
    if (fontFamily === "sans-serif") {
      realFontName = "'Noto Sans KR', sans-serif";
    } else if (fontFamily === "serif") {
      // index.css에서 불러온 정확한 이름인 'Noto Serif KR'로 수정했습니다.
      realFontName = "'Noto Serif KR', serif";
    } else if (fontFamily === "monospace") {
      // index.css에서 불러온 정확한 이름인 'Nanum Gothic'으로 수정했습니다.
      realFontName = "'Nanum Gothic', monospace";
    }
    
    // 강제 적용
    if (realFontName) {
      document.body.style.setProperty('font-family', realFontName, 'important');
    }
    
    localStorage.setItem('bibleapp-fontfamily', fontFamily);
  }, [fontFamily]);



  const increaseFontSize = () => {
  setFontSize(prev => (prev < 22 ? prev + 1 : prev));
};

  const decreaseFontSize = () => {
  setFontSize(prev => (prev > 14 ? prev - 1 : prev));
};

  return (
    <DisplaySettingsContext.Provider value={{ fontSize, fontFamily, setFontSize, increaseFontSize, decreaseFontSize, setFontFamily }}>
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
