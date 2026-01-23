import { Link, useLocation } from "wouter";
import { cn } from "../lib/utils";
import { 
  BookOpen, 
  MessageCircle, 
  Book, 
  Heart, 
  Archive 
} from "lucide-react";

interface BottomNavProps {
  fontSize?: number;
}

export function BottomNav({ fontSize = 16 }: BottomNavProps) {
  const [location] = useLocation();

  // 메뉴명을 원래 의도하신 대로 모두 복구했습니다.
  const tabs = [
    { id: "word", label: "오늘 말씀", path: "/", icon: BookOpen },
    { id: "qt", label: "오늘 묵상", path: "/qt", icon: MessageCircle },
    { id: "reading", label: "성경 읽기", path: "/reading", icon: Book },
    { id: "community", label: "중보 모임", path: "/community", icon: Heart },
    { id: "archive", label: "내 기록함", path: "/archive", icon: Archive },
  ];

  const scaleFactor = fontSize / 16;
  const iconSize = 20 * scaleFactor;
  const labelSize = 11 * scaleFactor;
  // 메뉴명이 길어지므로 하단바 높이를 조금 더 여유 있게(최소 64px) 잡았습니다.
  const navHeight = 64 + (fontSize - 16) * 0.9;

  return (
    <nav 
      className="fixed bottom-0 w-full max-w-[450px] bg-white/95 backdrop-blur-md border-t border-zinc-200 flex justify-between items-center px-0 pb-safe-area z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
      style={{ height: `${navHeight}px` }}
    >
      {tabs.map((tab) => {
        const cleanLocation = location.split('?')[0];
        const isActive = cleanLocation === tab.path;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.id}
            href={tab.path}
            className="flex-1 flex flex-col items-center justify-center h-full min-w-0" // min-w-0으로 글자 잘림 방지 준비
          >
            {/* 아이콘 영역 */}
            <div className="flex items-center justify-center" style={{ height: `${iconSize + 4}px` }}>
              <Icon 
                style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
                className={cn(
                  "transition-all duration-200",
                  isActive ? "text-[#8FA998]" : "text-zinc-400"
                )} 
              />
            </div>
            
            {/* 메뉴명 영역: whitespace-nowrap을 유지하되 글자가 커지면 자간을 줄여서 대응 */}
            <span 
              style={{ 
                fontSize: `${labelSize}px`,
                marginTop: `${2 * scaleFactor}px`,
                letterSpacing: fontSize > 18 ? '-0.05em' : '-0.02em' // 글자가 커지면 자간을 좁힘
              }}
              className={cn(
                "leading-tight text-center whitespace-nowrap px-0.5 transition-colors",
                isActive ? "text-[#8FA998] font-bold" : "text-zinc-500 font-medium"
              )}
            >
              {tab.label}
            </span>

            {/* 활성화 표시: 메뉴명이 길기 때문에 꽉 차는 바 형태보다는 중앙 정렬된 짧은 바가 깔끔합니다 */}
            {isActive && (
              <span 
                className="absolute bottom-1 w-6 h-0.5 bg-[#8FA998] rounded-full"
                style={{ bottom: `${2 * scaleFactor}px` }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}