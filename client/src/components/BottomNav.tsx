import React from "react";
import { Link, useLocation } from "wouter";
import {
  Sun,
  BookHeart,
  BookHeadphones,
  Church,
  HandHeart,
} from "lucide-react";

export function BottomNav() {
  const [location] = useLocation();

  return (
    <>
      <style>{`
        @keyframes amenBreathAnimation {
          0% { transform: scale(1.05); }
          25% { transform: scale(1.1); }
          50% { transform: scale(1.15); }
          75% { transform: scale(1.1); }
          100% { transform: scale(1.05); }
        }
      `}</style>
      <nav className="fixed bottom-0 left-0 right-0 z-[150] bg-white border-t px-1 pb-safe-area-inset-bottom h-[76px] flex items-center justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
      <NavItem
        href="/qt"
        icon={<BookHeart />}
        label="QT일기"
        active={location === "/qt"}
      />

      <NavItem
        href="/"
        icon={<Sun />}
        label="오늘말씀"
        active={location === "/"}
      />

      {/* myAmen */}
      <NavItem
        href="/prayer"
        icon={<HandHeart />}
        label="myAmen"
        customLabel={
          <span className="relative inline-block">
            <span className="text-[12px] font-medium absolute -top-1.5 -left-3.5">my</span>
            <span>Amen</span>
          </span>
        }
        active={location === "/prayer"}
        primary
      />

      <NavItem
        href="/reading"
        icon={<BookHeadphones />}
        label="성경읽기"
        active={location === "/reading"}
      />

      <NavItem
        href="/community"
        icon={<Church />}
        label="중보모임"
        active={location === "/community"}
      />
    </nav>
    </>
  );
}

interface NavItemProps {
  href: string;
  icon: React.ReactElement;
  label: string;
  active: boolean;
  primary?: boolean;
  customLabel?: React.ReactNode;
}

function NavItem({
  href,
  icon,
  label,
  active,
  primary = false,
  customLabel,
}: NavItemProps) {
  const handleClick = () => {
    if (navigator.vibrate) navigator.vibrate(12);
  };

  return (
    <Link href={href}>
      <div
        onClick={handleClick}
        className={`
          flex flex-col items-center justify-center min-w-[68px] h-full cursor-pointer
          transition-transform duration-200
          ${primary ? "-mt-4" : ""}
        `}
      >
        {/* 아이콘 */}
        <div
          className={`
            flex items-center justify-center
            transition-transform duration-200 ease-out
            ${
              primary
                ? `
                  w-14 h-14 rounded-full
                  ${
                    active
                      ? "bg-[#4A6741] text-white scale-110"
                      : "bg-white text-[#4A6741] border"
                  }
                  shadow-md
                `
                : `
                  p-1.5 rounded-2xl transition-transform duration-200
                  ${
                    active
                      ? "bg-green-50 text-[#4A6741] scale-110"
                      : "text-zinc-400"
                  }
                `
            }
          `}
          style={
            primary && active
              ? {
                  animation: 'amenBreathAnimation 6s ease-in-out infinite',
                }
              : undefined
          }
        >
          {React.cloneElement(icon, {
            size: primary ? 30 : 22,
            strokeWidth: 1.5,
          })}
        </div>

        {/* 라벨 */}
        <span
          className={`
            mt-0.5 tracking-tight transition-all duration-200
            ${
              primary
                ? active
                  ? "text-[14.5px] font-semibold text-[#4A6741] scale-105"
                  : "text-[14px] font-semibold text-[#4A6741]"
                : active
                ? "text-[13.5px] font-semibold text-[#4A6741] scale-105"
                : "text-[13px] font-semibold text-zinc-400"
            }
          `}
        >
          {customLabel || label}
        </span>
      </div>
    </Link>
  );
}
