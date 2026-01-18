import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();

  const tabs = [
    { id: "word", label: "오늘의 말씀", path: "/" },
    { id: "qt", label: "오늘의 묵상", path: "/qt" },
    { id: "reading", label: "성경 통독", path: "/reading" },
    { id: "archive", label: "내 기록함", path: "/archive" },
  ];

return (
  <nav className="fixed bottom-0 w-full max-w-[450px] bg-white/95 backdrop-blur-lg border-t border-zinc-200 flex justify-between items-stretch px-0 pb-safe-area z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
    {tabs.map((tab) => {
      const isActive = location === tab.path;
      return (
        <Link
          key={tab.id}
          href={tab.path}
          className={cn(
            "flex-1 flex items-center justify-center py-5 transition-all duration-200 relative",
            isActive 
              ? "text-white bg-[#5D7BAF] font-bold" // 1. 배경 파랑, 글자 흰색
              : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50"
          )}
          data-testid={`nav-${tab.id}`}
        >
          {isActive && (
            /* 2. 상단 바 색상을 흰색(bg-white)으로 변경 */
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-gray-100 rounded-b-full" />
          )}
          <span className={cn(
            "text-base tracking-tight leading-tight text-center whitespace-nowrap",
            isActive ? "font-bold" : "font-medium"
          )}>
            {tab.label}
          </span>
        </Link>
      );
    })}
  </nav>
);
  }