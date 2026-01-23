import { Link, useLocation } from "wouter";
import { cn } from "../lib/utils";
// 1. 사용할 아이콘들을 임포트합니다.
import { 
  BookOpen, 
  MessageCircle, 
  Book, 
  Heart, 
  Archive 
} from "lucide-react";

interface BottomNavProps {
  fontSize?: number; // 상단바에서 조절하는 폰트 사이즈 상태값
}

export function BottomNav({ fontSize = 16 }: BottomNavProps) {
  const [location] = useLocation();

  // 2. 메뉴 구성 (아이콘 포함)
  const tabs = [
    { id: "word", label: "말씀", path: "/", icon: BookOpen },
    { id: "qt", label: "묵상", path: "/qt", icon: MessageCircle },
    { id: "reading", label: "성경", path: "/reading", icon: Book },
    { id: "community", label: "중보", path: "/community", icon: Heart },
    { id: "archive", label: "기록", path: "/archive", icon: Archive },
  ];

  // 3. 폰트 사이즈에 따른 동적 크기 계산 (기본 16px 기준 비율)
  const scaleFactor = fontSize / 16;
  const iconSize = 20 * scaleFactor;   // 아이콘 기본 20px
  const labelSize = 11 * scaleFactor;  // 글자 기본 11px
  const navHeight = 60 + (fontSize - 16) * 0.8; // 글자가 커지면 바 높이도 유동적 조절

  return (
    <nav 
      className="fixed bottom-0 w-full max-w-[450px] bg-white/95 backdrop-blur-md border-t border-zinc-200 flex justify-around items-center px-1 pb-safe-area z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]"
      style={{ height: `${navHeight}px` }}
    >
      {tabs.map((tab) => {
        // 주소창에서 쿼리 스트링 등을 제외한 순수 경로만 추출하여 활성화 체크
        const cleanLocation = location.split('?')[0];
        const isActive = cleanLocation === tab.path;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.id}
            href={tab.path}
            className="flex-1 flex flex-col items-center justify-center relative h-full transition-all duration-200"
          >
            {/* 아이콘: fontSize에 비례하여 크기 변경 */}
            <Icon 
              style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
              className={cn(
                "transition-all duration-300",
                isActive ? "text-[#8FA998] scale-110" : "text-zinc-400"
              )} 
            />
            
            {/* 메뉴명: fontSize에 비례하여 크기 변경 */}
            <span 
              style={{ 
                fontSize: `${labelSize}px`,
                marginTop: `${2 * scaleFactor}px` 
              }}
              className={cn(
                "tracking-tighter leading-none transition-colors whitespace-nowrap",
                isActive ? "text-[#8FA998] font-bold" : "text-zinc-500 font-medium"
              )}
            >
              {tab.label}
            </span>

            {/* 활성화 표시: 아이콘 아래 작은 점(Dot) 또는 하단 바 */}
            {isActive && (
              <span 
                className="absolute bottom-1 w-1 h-1 bg-[#8FA998] rounded-full"
                style={{ bottom: `${4 * scaleFactor}px` }} // 위치도 비율에 맞게 조정
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}