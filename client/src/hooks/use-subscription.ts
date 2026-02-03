import { useEffect, useState } from "react";
import { useAuth } from "./use-auth";

interface SubscriptionStatus {
  tier: "free" | "trial" | "pro";
  features: {
    canAccessDailyVerse: boolean;
    canAccessReading: boolean;
    canAccessPrayer: boolean;
    canShareMeditation: boolean;
    canAccessCommunity: boolean;
    canAccessAdvancedFeatures: boolean;
    canUploadAudio: boolean;
    canAccessArchive: boolean;
    maxMeditationsPerDay: number;
    maxWordSharesPerDay: number;
  };
  daysUntilExpiration: number | null;
}

export function useSubscription() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setStatus(null);
      setLoading(false);
      return;
    }

    fetchSubscriptionStatus();
  }, [user?.id]);

  const fetchSubscriptionStatus = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const response = await fetch("/api/subscription/status", {
        headers: {
          "x-user-id": user.id,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        setError(null);
      } else {
        setError("Failed to fetch subscription status");
      }
    } catch (err) {
      console.error("Failed to fetch subscription status:", err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const startTrial = async () => {
    if (!user?.id) return { success: false, message: "로그인이 필요합니다" };

    try {
      const response = await fetch("/api/subscription/trial", {
        method: "POST",
        headers: {
          "x-user-id": user.id,
        },
      });

      const data = await response.json();
      if (response.ok) {
        await fetchSubscriptionStatus();
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      console.error("Failed to start trial:", err);
      return { success: false, message: "체험 시작에 실패했습니다" };
    }
  };

  const upgradeToPro = async () => {
    if (!user?.id) return { success: false, message: "로그인이 필요합니다" };

    try {
      const response = await fetch("/api/subscription/upgrade", {
        method: "POST",
        headers: {
          "x-user-id": user.id,
        },
      });

      const data = await response.json();
      if (response.ok) {
        await fetchSubscriptionStatus();
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      console.error("Failed to upgrade:", err);
      return { success: false, message: "업그레이드에 실패했습니다" };
    }
  };

  const isPro = status?.tier === "pro";
  const isTrial = status?.tier === "trial";
  const isFree = status?.tier === "free" || !status;

  return {
    status,
    loading,
    error,
    isPro,
    isTrial,
    isFree,
    startTrial,
    upgradeToPro,
    refresh: fetchSubscriptionStatus,
  };
}
