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
  const topBarHeightRef = useRef(100); // --app-topbar-height 계산값 캐시
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const THRESHOLD = 64; // iOS Safari / Twitter / Instagram 기준값과 동일

  // CSS variable --app-topbar-height 실제 px 계산
  useEffect(() => {
    const el = document.createElement("div");
    el.style.cssText = "position:absolute;visibility:hidden;height:var(--app-topbar-height,100px)";
    document.body.appendChild(el);
    topBarHeightRef.current = el.offsetHeight || 100;
    document.body.removeChild(el);
  }, []);

  const triggerRefresh = useCallback(() => {
    if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }
    setRefreshing(true);
    setRefreshKey(k => k + 1);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // 이전 제스처에서 고착된 상태 초기화
    startYRef.current = null;
    pullDistRef.current = 0;
    setPulling(false);

    const touch = e.touches[0];
    if (touch.clientY < topBarHeightRef.current) return;

    let el: HTMLElement | null = e.target as HTMLElement;
    while (el && el !== document.documentElement) {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollTop > 2) return;
      if (style.position === 'fixed') return;
      el = el.parentElement;
    }
    if ((document.scrollingElement?.scrollTop ?? window.scrollY) > 2) return;

    startYRef.current = touch.clientY;
    pullDistRef.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startYRef.current === null || refreshing) return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy < 0) {
      if (pullDistRef.current > 10) {
        startYRef.current = null;
        pullDistRef.current = 0;
        setPTRTracking(false);
        setPulling(false);
        if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }
      }
      return;
    }
    pullDistRef.current = Math.min(dy, THRESHOLD * 1.5);
    const nowPulling = pullDistRef.current > 10;
    if (nowPulling) {
      setPTRTracking(true);
      if (!safetyTimerRef.current) {
        safetyTimerRef.current = setTimeout(() => {
          safetyTimerRef.current = null;
          startYRef.current = null;
          pullDistRef.current = 0;
          setPulling(false);
          setPTRTracking(false);
        }, 300);
      }
    }
    setPulling(nowPulling);
  }, [refreshing]);

  const handleTouchEnd = useCallback(() => {
    if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }
    const shouldRefresh = startYRef.current !== null && pullDistRef.current >= THRESHOLD;
    startYRef.current = null;
    pullDistRef.current = 0;
    setPTRTracking(false);
    setPulling(false);
    if (shouldRefresh) triggerRefresh();
  }, [triggerRefresh]);

  const handleTouchCancel = useCallback(() => {
    if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }
    const shouldRefresh = startYRef.current !== null && pullDistRef.current >= THRESHOLD;
    startYRef.current = null;
    pullDistRef.current = 0;
    setPTRTracking(false);
    setPulling(false);
    if (shouldRefresh) triggerRefresh();
  }, [triggerRefresh]);

  // window 레벨 native 이벤트로 touchend/touchcancel을 보완 등록
  // DnD(TouchSensor) 등이 React 합성 이벤트를 가로채더라도 항상 pulling 상태를 해제
  useEffect(() => {
    const onNativeTouchEnd = () => {
      if (startYRef.current === null && pullDistRef.current === 0) return;
      if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }
      const shouldRefresh = startYRef.current !== null && pullDistRef.current >= THRESHOLD;
      startYRef.current = null;
      pullDistRef.current = 0;
      setPTRTracking(false);
      setPulling(false);
      if (shouldRefresh) triggerRefresh();
    };
    const onNativeTouchCancel = () => {
      if (startYRef.current === null && pullDistRef.current === 0) return;
      if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }
      const shouldRefresh = startYRef.current !== null && pullDistRef.current >= THRESHOLD;
      startYRef.current = null;
      pullDistRef.current = 0;
      setPTRTracking(false);
      setPulling(false);
      if (shouldRefresh) triggerRefresh();
    };
    window.addEventListener('touchend', onNativeTouchEnd, { passive: true, capture: true });
    window.addEventListener('touchcancel', onNativeTouchCancel, { passive: true, capture: true });
    return () => {
      window.removeEventListener('touchend', onNativeTouchEnd, { capture: true });
      window.removeEventListener('touchcancel', onNativeTouchCancel, { capture: true });
      if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }
    };
  }, [triggerRefresh]);

  return (
    <RefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      <div
        className="contents"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
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
