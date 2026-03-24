import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RefreshContextValue {
  refreshKey: number;
  triggerRefresh: () => void;
}

const RefreshContext = createContext<RefreshContextValue>({ refreshKey: 0, triggerRefresh: () => {} });

export function useRefresh() {
  return useContext(RefreshContext);
}

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const startYRef = useRef<number | null>(null);
  const pullDistRef = useRef(0);
  const THRESHOLD = 64; // iOS Safari / Twitter / Instagram 기준값과 동일

  const triggerRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey(k => k + 1);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollable = (e.target as HTMLElement).closest('[data-overscroll], .overflow-y-auto, .overflow-y-scroll, .overflow-auto, .overflow-scroll');
    const scrollTop = scrollable ? (scrollable as HTMLElement).scrollTop : window.scrollY;
    if (scrollTop > 2) return;
    startYRef.current = e.touches[0].clientY;
    pullDistRef.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startYRef.current === null || refreshing) return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy < 0) { startYRef.current = null; return; }
    pullDistRef.current = Math.min(dy, THRESHOLD * 1.5);
    setPulling(pullDistRef.current > 10);
  }, [refreshing]);

  const handleTouchEnd = useCallback(() => {
    if (startYRef.current === null) return;
    if (pullDistRef.current >= THRESHOLD) {
      triggerRefresh();
    }
    startYRef.current = null;
    pullDistRef.current = 0;
    setPulling(false);
  }, [triggerRefresh]);

  return (
    <RefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      <div
        className="contents"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* PTR 인디케이터 */}
        <AnimatePresence>
          {(pulling || refreshing) && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="fixed top-0 left-0 right-0 z-[500] flex justify-center pt-14 pointer-events-none"
            >
              <div className="flex items-center justify-center bg-black/60 backdrop-blur-sm p-2.5 rounded-full shadow-lg">
                <motion.div
                  animate={refreshing ? { rotate: 360 } : {}}
                  transition={refreshing ? { duration: 0.6, repeat: Infinity, ease: "linear" } : {}}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {children}
      </div>
    </RefreshContext.Provider>
  );
}
