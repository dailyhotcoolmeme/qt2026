import React from "react";
import { Link, useLocation } from "wouter";
import { Sun, BookHeart, BookOpenText, BookHeadphones, Church, HandHeart } from "lucide-react";

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[150] bg-white border-t px-1 pb-safe-area-inset-bottom h-[76px] flex items-center justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
      <NavItem href="/" icon={<Sun />} label="오늘말씀" active={location === "/"} />
      <NavItem href="/reading" icon={<BookOpenText />} label="성경읽기" active={location === "/reading"} />
      <NavItem href="/qt" icon={<BookHeart />} label="QT일기" active={location === "/qt"} />
      <NavItem href="/prayer" icon={<HandHeart />} label="매일기도" active={location === "/prayer"} />
      <NavItem href="/community" icon={<Church />} label="중보모임" active={location === "/community"} />
    </nav>
  );
}

interface NavItemProps {
  href: string;
  icon: React.ReactElement;
  label: string;
  active: boolean;
}

function NavItem({ href, icon, label, active }: NavItemProps) {
  const handleClick = () => {
    if (navigator.vibrate) navigator.vibrate(12);
  };

  return (
    <Link href={href}>
      <div
        onClick={handleClick}
        className="flex flex-col items-center justify-center min-w-[68px] h-full cursor-pointer transition-transform duration-200"
      >
        <div
          className={`flex items-center justify-center p-1.5 rounded-2xl transition-transform duration-200 ease-out ${
            active ? "bg-green-50 text-[#4A6741] scale-110" : "text-zinc-400"
          }`}
        >
          {React.cloneElement(icon, {
            size: 22,
            strokeWidth: 1.5,
          })}
        </div>

        <span
          className={`mt-0.5 tracking-tight transition-all duration-200 ${
            active ? "text-[13.5px] font-semibold text-[#4A6741] scale-105" : "text-[13px] font-semibold text-zinc-400"
          }`}
        >
          {label}
        </span>
      </div>
    </Link>
  );
}
