import { ReactNode } from "react";
import { cn } from "../lib/utils";
import { useDisplaySettings } from "./DisplaySettingsProvider";

export function Layout({ children, className }: { children: ReactNode; className?: string }) {
  const { fontFamily, fontSize } = useDisplaySettings();

  return (
    <div className="min-h-screen w-full bg-zinc-50 flex justify-center">
      <div 
        className={cn(
          "w-full max-w-[450px] min-h-screen bg-white shadow-2xl shadow-zinc-200/50 flex flex-col pb-[70px] relative overflow-hidden",
          className
        )}
        style={{
          fontFamily: fontFamily === 'serif' ? '"Noto Serif KR", serif' : 
                      fontFamily === 'monospace' ? '"Nanum Gothic", monospace' : 
                      '"Noto Sans KR", sans-serif',
          fontSize: `${fontSize}px`
        }}
      >
        {children}
      </div>
    </div>
  );
}