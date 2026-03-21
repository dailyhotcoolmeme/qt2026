import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHashLocation } from "wouter/use-hash-location";
import { Sun, BookOpenText, BookHeart, HandHeart, Church, ChevronRight } from "lucide-react";

const ONBOARDING_KEY = "myamen_onboarding_done";

export function isOnboardingDone() {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return true;
  }
}

const slides = [
  {
    icon: <Sun size={56} strokeWidth={1.2} className="text-[#4A6741]" />,
    label: "오늘말씀",
    title: "말씀으로 시작하는\n하루",
    desc: "매일 아침 새로운 말씀으로 하루를 열어보세요.\n마음에 닿는 말씀은 카드로 만들어\n가까운 사람들과 나눌 수 있어요.",
    bg: "from-yellow-50 to-green-50",
  },
  {
    icon: <BookOpenText size={56} strokeWidth={1.2} className="text-blue-500" />,
    label: "성경읽기",
    title: "듣고 읽으며\n성경을 통독하세요",
    desc: "매일 읽을 범위를 스스로 정하고,\n출퇴근길에 음성으로 들어도 좋아요.\n꾸준한 통독 습관이 삶을 바꿉니다.",
    bg: "from-blue-50 to-indigo-50",
  },
  {
    icon: <BookHeart size={56} strokeWidth={1.2} className="text-rose-400" />,
    label: "QT일기",
    title: "말씀 묵상을\n기록으로 남기세요",
    desc: "매일 QT 말씀과 질문을 따라\n나만의 묵상 기록을 남겨보세요.\n쌓인 기록이 소중한 신앙 일기가 됩니다.",
    bg: "from-rose-50 to-pink-50",
  },
  {
    icon: <HandHeart size={56} strokeWidth={1.2} className="text-purple-400" />,
    label: "매일기도",
    title: "기도하는 습관이\n평생의 자산입니다",
    desc: "마음속 기도도, 음성 기도도 모두 좋아요.\n기도를 기록하고 응답을 확인하다 보면\n기도가 삶의 가장 든든한 힘이 됩니다.",
    bg: "from-purple-50 to-violet-50",
  },
  {
    icon: <Church size={56} strokeWidth={1.2} className="text-[#4A6741]" />,
    label: "중보모임",
    title: "함께하는 신앙이\n더 깊어집니다",
    desc: "교회 소그룹, 구역, 가족 모임을 만들어\n서로의 신앙을 독려하고 교제해 보세요.\n함께하는 나눔에 특화되어 있어요.",
    bg: "from-green-50 to-emerald-50",
  },
  {
    icon: null,
    label: "",
    title: "",
    desc: "",
    bg: "from-white to-white",
  },
];

export default function OnboardingPage() {
  const [current, setCurrent] = useState(0);
  const [, setLocation] = useHashLocation();
  const startX = useRef<number | null>(null);

  const finish = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, "1");
    } catch { /* ignore */ }
    setLocation("/");
  };

  const next = () => {
    if (current < slides.length - 1) setCurrent(current + 1);
    else finish();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const diff = startX.current - e.changedTouches[0].clientX;
    if (diff > 50 && current < slides.length - 1) setCurrent(current + 1);
    if (diff < -50 && current > 0) setCurrent(current - 1);
    startX.current = null;
  };

  const slide = slides[current];
  const isLast = current === slides.length - 1;

  return (
    <div
      className={`relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-gradient-to-b ${slide.bg} px-8 pb-12 pt-20 transition-colors duration-500`}
      style={{ paddingTop: "calc(80px + var(--safe-top-inset))", paddingBottom: "calc(48px + var(--safe-bottom-inset))" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 점 인디케이터 */}
      <div className="flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all duration-300 ${i === current ? "w-6 bg-[#4A6741]" : "w-2 bg-zinc-300"}`}
          />
        ))}
      </div>

      {/* 슬라이드 콘텐츠 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex flex-1 flex-col items-center justify-center gap-8 text-center"
        >
          {current === slides.length - 1 ? (
            <div className="flex flex-col items-center gap-6 text-center">
              <img src="/icon-192.png" alt="마이아멘" className="h-28 w-28" />
              <div className="space-y-4">
                <h2 className="text-4xl font-black tracking-tighter text-[#4A6741]">마이아멘</h2>
                <p className="whitespace-pre-line text-base leading-relaxed text-zinc-500">
                  {"나의 신앙 기록을\n기억하고, 나누고, 공감하세요.\n\n지금 바로 시작해 보세요."}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex h-28 w-28 items-center justify-center rounded-[32px] bg-white shadow-lg">
                {slide.icon}
              </div>
              <div className="space-y-3">
                <p className="text-sm font-bold tracking-widest text-[#4A6741] uppercase">{slide.label}</p>
                <h2 className="whitespace-pre-line text-3xl font-black leading-tight tracking-tighter text-zinc-900">
                  {slide.title}
                </h2>
                <p className="whitespace-pre-line text-base leading-relaxed text-zinc-500">
                  {slide.desc}
                </p>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 버튼 영역 */}
      <div className="flex w-full flex-col gap-3">
        <button
          onClick={next}
          className="flex h-[60px] w-full items-center justify-center gap-2 rounded-[22px] bg-[#4A6741] font-bold text-white shadow-sm transition-all active:scale-95"
        >
          {isLast ? "시작하기" : "다음"}
          {!isLast && <ChevronRight size={20} />}
        </button>
        <button onClick={finish} className={`py-2 text-sm font-medium text-zinc-400 ${isLast ? "invisible" : ""}`}>
          건너뛰기
        </button>
      </div>
    </div>
  );
}
