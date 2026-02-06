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
    <nav className="fixed bottom-0 left-0 right-0 z-[150] bg-white border-t px-1 pb-safe-area-inset-bottom h-[76px] flex items-center justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
      
      {/* 묵상일기 */}
      <NavItem
        href="/qt"
        icon={<BookHeart />}
        label="묵상일기"
        active={location === "/qt"}
      />

      {/* 오늘말씀 */}
      <NavItem
        href="/"
        icon={<Sun />}
        label="오늘말씀"
        active={location === "/"}
      />

      {/* myAmen - 중앙 강조 */}
      <NavItem
        href="/prayer"
        icon={<HandHeart />}
        label="myAmen"
        active={location === "/prayer"}
        primary
      />

      {/* 성경읽기 */}
      <NavItem
        href="/reading"
        icon={<BookHeadphones />}
        label="성경읽기"
        active={location === "/reading"}
      />

      {/* 중보모임 */}
      <NavItem
        href="/community"
        icon={<Church />}
        label="중보모임"
        active={location === "/community"}
      />
    </nav>
  );
}

interface NavItemProps {
  href: string;
  icon: React.ReactElement;
  label: string;
  active: boolean;
  primary?: boolean; // 👈 myAmen 전용
}

function NavItem({ href, icon, label, active, primary = false }: NavItemProps) {
  return (
    <Link href={href}>
      <div
        className={`
          flex flex-col items-center justify-center min-w-[68px] h-full cursor-pointer
          ${primary ? "-mt-4" : ""}
        `}
      >
        {/* 아이콘 버튼 */}
        <div
          className={`
            flex items-center justify-center rounded-full transition-all
            ${
              primary
                ? `w-14 h-14 shadow-lg ${
                    active
                      ? "bg-[#4A6741] text-white"
                      : "bg-white text-[#4A6741] border"
                  }`
                : `p-1.5 rounded-2xl ${
                    active
                      ? "bg-green-50 text-[#4A6741]"
                      : "text-zinc-400"
                  }`
            }
          `}
        >
          {React.cloneElement(icon, {
            size: primary ? 30 : 22,
            strokeWidth: active ? 2.5 : 2,
          })}
        </div>

        {/* 라벨 */}
        <span
          className={`
            mt-1 tracking-tighter
            ${
              primary
                ? "text-[14px] font-bold text-[#4A6741]"
                : active
                ? "text-[#4A6741] text-[13px] font-bold"
                : "text-zinc-400 text-[13px] font-bold"
            }
          `}
        >
          {label}
        </span>
      </div>
    </Link>
  );
}
