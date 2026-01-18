import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const pages = [
  { title: "나의 묵상집", date: "2024년 1월", content: "이 책은 당신의 영적 여정을 담고 있습니다." },
  { title: "창세기 1장 묵상", date: "1월 1일", content: "태초에 하나님이 천지를 창조하셨다. 이 말씀을 통해 하나님의 능력과 창조의 신비를 묵상했습니다." },
  { title: "시편 23편 묵상", date: "1월 2일", content: "여호와는 나의 목자시니 내게 부족함이 없으리로다. 주님의 돌보심에 감사드립니다." },
  { title: "요한복음 3:16 묵상", date: "1월 3일", content: "하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니... 그 사랑에 감동받았습니다." },
];

export function FlipBook() {
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0);

  const nextPage = () => {
    if (currentPage < pages.length - 1) {
      setDirection(1);
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setDirection(-1);
      setCurrentPage(prev => prev - 1);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      rotateY: direction > 0 ? -90 : 90,
      opacity: 0,
      scale: 0.8,
    }),
    center: {
      rotateY: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1],
      },
    },
    exit: (direction: number) => ({
      rotateY: direction > 0 ? 90 : -90,
      opacity: 0,
      scale: 0.8,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1],
      },
    }),
  };

  return (
    <div className="relative" style={{ perspective: "1000px" }}>
      <div className="relative h-48 w-full overflow-hidden rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg border border-amber-200">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentPage}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 p-4 flex flex-col"
            style={{ 
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden",
            }}
          >
            <div className="flex-1">
              <p className="text-[10px] text-amber-600 mb-1">{pages[currentPage].date}</p>
              <h4 className="font-bold text-zinc-800 text-sm mb-2">{pages[currentPage].title}</h4>
              <p className="text-xs text-zinc-600 leading-relaxed">{pages[currentPage].content}</p>
            </div>
            <div className="flex justify-center gap-1 mt-2">
              {pages.map((_, idx) => (
                <span 
                  key={idx} 
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentPage ? 'bg-amber-500' : 'bg-amber-200'}`} 
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-amber-300/50 to-transparent rounded-l-lg" />
        
        <button 
          onClick={prevPage}
          disabled={currentPage === 0}
          className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/80 shadow-sm disabled:opacity-30 hover:bg-white transition-colors"
          data-testid="button-prev-page"
        >
          <ChevronLeft className="w-4 h-4 text-zinc-600" />
        </button>
        <button 
          onClick={nextPage}
          disabled={currentPage === pages.length - 1}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/80 shadow-sm disabled:opacity-30 hover:bg-white transition-colors"
          data-testid="button-next-page"
        >
          <ChevronRight className="w-4 h-4 text-zinc-600" />
        </button>
      </div>
    </div>
  );
}
