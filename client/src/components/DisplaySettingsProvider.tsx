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

  // 폰트 설정도 로컬 스토리지에서 불러오도록 개선
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

  // 2. 폰트 종류 적용 (이 부분이 추가되었습니다!)
  useEffect(() => {
    // document.body의 폰트를 직접 변경하여 전체 페이지에 적용합니다.
    let realFont = "";
    if (fontFamily === "sans-serif") realFont = "'Noto Sans KR', sans-serif";
    else if (fontFamily === "serif") realFont = "'Nanum Myeongjo', serif";
    else if (fontFamily === "monospace") realFont = "'Nanum Gothic', monospace";
    
    document.body.style.fontFamily = realFont;
    localStorage.setItem('bibleapp-fontfamily', fontFamily);
  }, [fontFamily]);
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
