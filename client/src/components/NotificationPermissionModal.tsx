import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { requestNotificationPermission } from "../lib/pushNotifications";
import { useAuth } from "../hooks/use-auth";
import { loadNotificationSettings, saveNotificationSettings } from "../lib/notificationPreferences";

const STORAGE_KEY = "push-perm-asked";
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export function shouldShowNotificationModal(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (!val) return true;
    if (val === "done") return false;
    const ts = Number(val.replace("dismissed:", ""));
    if (!isNaN(ts) && Date.now() - ts >= THREE_DAYS_MS) return true;
    return false;
  } catch {
    return false;
  }
}

export function markNotificationModalDone() {
  try { localStorage.setItem(STORAGE_KEY, "done"); } catch {}
}

interface Props {
  onClose: () => void;
}

export function NotificationPermissionModal({ onClose }: Props) {
  const { user } = useAuth();

  const handleAllow = async () => {
    markNotificationModalDone();
    // onClose를 권한 요청 후에 호출해야 비동기 작업이 중단되지 않음
    const result = await requestNotificationPermission();
    // 기기 권한이 허용되면 앱 토글도 ON으로 변경
    if (result === "granted" && user?.id) {
      try {
        const settings = await loadNotificationSettings(user.id);
        if (!settings.pushEnabled) {
          const updated = { ...settings, pushEnabled: true };
          await saveNotificationSettings(user.id, updated);
          // TopBar에 설정 변경 알림
          window.dispatchEvent(new Event('notification-settings-changed'));
        }
      } catch {}
    }
    onClose();
  };

  const handleLater = () => {
    try { localStorage.setItem(STORAGE_KEY, `dismissed:${Date.now()}`); } catch {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex flex-col justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleLater}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%", transition: { duration: 0.12, ease: [0.32, 0.72, 0, 1] } }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative bg-white rounded-t-3xl shadow-2xl max-w-lg mx-auto w-full"
      >
        <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mt-3" />
        <div className="px-6 pt-5 pb-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#4A6741]/10 flex items-center justify-center mb-4">
            <Bell size={30} className="text-[#4A6741]" />
          </div>
          <h2 className="text-lg font-black text-zinc-900 mb-6">
            알림을 허용하면 모임원들과의<br />신앙활동이 풍성해져요
          </h2>
          <button
            onClick={() => { void handleAllow(); }}
            className="w-full py-3.5 rounded-2xl bg-[#4A6741] text-white font-bold text-base mb-3"
          >
            알림 허용하기
          </button>
          <button
            onClick={handleLater}
            className="text-sm text-zinc-400 py-1"
          >
            나중에
          </button>
        </div>
      </motion.div>
    </div>
  );
}
