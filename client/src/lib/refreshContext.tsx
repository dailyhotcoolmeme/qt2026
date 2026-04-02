import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { setPTRTracking } from "./ptrState";

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
  const maxPullRef = useRef(0);
  const topBarHeightRef = useRef(100);
  const THRESHOLD = 64;

  // CSS variable --app-topbar-height 실제 px 계산
  useEffect(() => {
    const el = document.createElement("div");
    el.style.cssText = "position:absolute;visibility:hidden;height:var(--app-topbar-height,100px)";
    document.body.appendChild(el);
    topBarHeightRef.current = el.offsetHeight || 100;
    document.body.removeChild(el);
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey(k => k + 1);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  useEffect(() => {
    // window capture 방식: 카드의 stopPropagation 여부와 무관하게 항상 먼저 실행
    const onNativeTouchStart = (e: TouchEvent) => {
      startYRef.current = null;
      pullDistRef.current = 0;
      maxPullRef.current = 0;
      setPulling(false);

      const touch = e.touches[0];
      if (!touch) return;
      // topbar 영역 터치는 무시
      if (touch.clientY < topBarHeightRef.current) return;

      // 터치 대상의 조상 중 스크롤된 컨테이너 또는 fixed 요소가 있으면 무시
      let el: HTMLElement | null = touch.target as HTMLElement;
      while (el && el !== document.documentElement) {
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollTop > 2) return;
        if (style.position === 'fixed') return;
        el = el.parentElement;
      }
      // 페이지 자체가 스크롤된 경우 무시
      if ((document.scrollingElement?.scrollTop ?? window.scrollY) > 2) return;

      startYRef.current = touch.clientY;
    };

    const onNativeTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null) return;
      const touch = e.touches[0];
      if (!touch) return;
      const dy = touch.clientY - startYRef.current;
      if (dy < 0) {
        // 위로 올라간 경우: 인디케이터 숨기되 제스처 유지
        setPulling(false);
        return;
      }
      // 아래로 당기는 중: Chrome 스크롤/PTR 인터셉트 차단
      e.preventDefault();
      const newDist = Math.min(dy, THRESHOLD * 1.5);
      pullDistRef.current = newDist;
      if (newDist > maxPullRef.current) maxPullRef.current = newDist;
      const nowPulling = newDist > 10;
      if (nowPulling) setPTRTracking(true);
      setPulling(nowPulling);
    };

    const onNativeTouchEndOrCancel = () => {
      if (startYRef.current === null) return;
      const shouldRefresh = maxPullRef.current >= THRESHOLD;
      startYRef.current = null;
      pullDistRef.current = 0;
      maxPullRef.current = 0;
      setPTRTracking(false);
      setPulling(false);
      if (shouldRefresh) triggerRefresh();
    };

    window.addEventListener('touchstart', onNativeTouchStart, { passive: true, capture: true });
    window.addEventListener('touchmove', onNativeTouchMove, { passive: false, capture: true });
    window.addEventListener('touchend', onNativeTouchEndOrCancel, { passive: true, capture: true });
    window.addEventListener('touchcancel', onNativeTouchEndOrCancel, { passive: true, capture: true });

    return () => {
      window.removeEventListener('touchstart', onNativeTouchStart, { capture: true });
      window.removeEventListener('touchmove', onNativeTouchMove, { capture: true });
      window.removeEventListener('touchend', onNativeTouchEndOrCancel, { capture: true });
      window.removeEventListener('touchcancel', onNativeTouchEndOrCancel, { capture: true });
    };
  }, [triggerRefresh]);

  return (
    <RefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      <div className="contents">
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
