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
  const ptrTouchIdRef = useRef<number | null>(null);  // PTR 추적 중인 손가락 identifier
  const topBarHeightRef = useRef(100);
  const THRESHOLD = 64;

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
    const onNativeTouchStart = (e: TouchEvent) => {
      if (startYRef.current !== null && ptrTouchIdRef.current !== null) {
        const ptrStillActive = Array.from(e.touches).some(
          t => t.identifier === ptrTouchIdRef.current
        );
        if (ptrStillActive) return;
      }

      startYRef.current = null;
      pullDistRef.current = 0;
      maxPullRef.current = 0;
      ptrTouchIdRef.current = null;
      setPulling(false);

      const touch = e.changedTouches[0];
      if (!touch) return;
      if (touch.clientY < topBarHeightRef.current) {
        return;
      }

      let el: HTMLElement | null = touch.target as HTMLElement;
      while (el && el !== document.documentElement) {
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollTop > 2) {
          return;
        }
        if (style.position === 'fixed') {
          return;
        }
        el = el.parentElement;
      }
      if ((document.scrollingElement?.scrollTop ?? window.scrollY) > 2) {
        return;
      }

      startYRef.current = touch.clientY;
      ptrTouchIdRef.current = touch.identifier;
      console.log('[PTR] START: y=', touch.clientY, 'id=', touch.identifier);
    };

    const onNativeTouchMove = (e: TouchEvent) => {
      console.log('[PTR-RAW] touchmove touches=', e.touches.length, 'ptrId=', ptrTouchIdRef.current);
      if (startYRef.current === null || ptrTouchIdRef.current === null) return;

      // PTR을 시작한 특정 손가락만 처리
      const touch = Array.from(e.touches).find(t => t.identifier === ptrTouchIdRef.current);
      if (!touch) return;

      const dy = touch.clientY - startYRef.current;
      if (dy < 0) {
        // 스크롤 방향 — 이미 PTR 당기다 되돌아오는 경우만 preventDefault
        if (maxPullRef.current > 0) e.preventDefault();
        setPulling(false);
        return;
      }
      e.preventDefault();
      const newDist = Math.min(dy, THRESHOLD * 1.5);
      pullDistRef.current = newDist;
      if (newDist > maxPullRef.current) maxPullRef.current = newDist;
      const nowPulling = newDist > 10;
      if (nowPulling) setPTRTracking(true);
      setPulling(nowPulling);
    };

    const onNativeTouchEndOrCancel = (e: TouchEvent) => {
      console.log('[PTR-RAW] touchend/cancel type=', e.type, 'changedIds=', Array.from(e.changedTouches).map(t=>t.identifier), 'ptrId=', ptrTouchIdRef.current);
      if (startYRef.current === null || ptrTouchIdRef.current === null) return;

      // PTR 손가락이 이번에 올라갔는지 확인
      const ptrTouchEnded = Array.from(e.changedTouches).some(
        t => t.identifier === ptrTouchIdRef.current
      );
      if (!ptrTouchEnded) return;  // 다른 손가락이 올라간 것이므로 무시

      const shouldRefresh = maxPullRef.current >= THRESHOLD;
      console.log('[PTR] END: maxPull=', Math.round(maxPullRef.current), 'refresh=', shouldRefresh);
      startYRef.current = null;
      pullDistRef.current = 0;
      maxPullRef.current = 0;
      ptrTouchIdRef.current = null;
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
