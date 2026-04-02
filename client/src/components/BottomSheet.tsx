import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

/**
 * 업계 표준 바텀시트 컴포넌트.
 * - 상단 핸들바 (순수 장식)
 * - 백드롭 탭 닫기
 * - framer-motion 스와이프 다운 닫기 (속도 500px/s 이상 또는 80px 이상 드래그)
 * - position: fixed 이므로 RefreshContext PTR과 충돌 없음
 */
export function BottomSheet({ open, onClose, children, title }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 백드롭 */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[199] bg-black/50 backdrop-blur-[2px]"
          />

          {/* 시트 */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_, info) => {
              if (info.velocity.y > 500 || info.offset.y > 80) {
                onClose();
              }
            }}
            className="fixed bottom-0 left-0 right-0 z-[200] max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl"
          >
            {/* 핸들바 (순수 장식) */}
            <div className="pt-3 pb-2">
              <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto" />
            </div>

            {/* 헤더 (title이 있을 때만 표시) */}
            {title && (
              <div className="flex items-center justify-between px-5 pb-3">
                <h3 className="font-black text-zinc-900 text-lg">{title}</h3>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* 컨텐츠 */}
            <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
