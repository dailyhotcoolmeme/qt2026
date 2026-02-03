import React, { useEffect, useState } from "react";
import { Crown, Zap, Check, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";

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

export default function SubscriptionPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setLocation("/");
      return;
    }
    fetchSubscriptionStatus();
  }, [user?.id]);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch("/api/subscription/status", {
        headers: {
          "x-user-id": user?.id || "",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch subscription status:", error);
    } finally {
      setLoading(false);
    }
  };

  const startTrial = async () => {
    setActionLoading(true);
    try {
      const response = await fetch("/api/subscription/trial", {
        method: "POST",
        headers: {
          "x-user-id": user?.id || "",
        },
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        fetchSubscriptionStatus();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Failed to start trial:", error);
      alert("체험 시작에 실패했습니다");
    } finally {
      setActionLoading(false);
    }
  };

  const upgradeToPro = async () => {
    setActionLoading(true);
    try {
      const response = await fetch("/api/subscription/upgrade", {
        method: "POST",
        headers: {
          "x-user-id": user?.id || "",
        },
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        fetchSubscriptionStatus();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Failed to upgrade:", error);
      alert("업그레이드에 실패했습니다");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  const freeFeatures = [
    "매일 말씀 읽기",
    "성경 통독",
    "기도 기록 (하루 3개)",
    "묵상 나눔 (하루 3개)",
  ];

  const trialFeatures = [
    ...freeFeatures,
    "커뮤니티 접근",
    "고급 기능 사용",
    "음성 녹음 기능",
    "아카이브 접근",
    "기도/묵상 (하루 10개)",
  ];

  const proFeatures = [
    ...freeFeatures,
    "커뮤니티 접근",
    "모든 고급 기능",
    "음성 녹음 무제한",
    "아카이브 전체 접근",
    "기도/묵상 무제한",
    "우선 지원",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => setLocation("/")}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">구독 관리</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Current Status */}
        {status && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-white rounded-2xl shadow-sm"
          >
            <h2 className="text-lg font-bold mb-2">현재 구독 상태</h2>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl font-bold capitalize">
                {status.tier === "free" && "무료"}
                {status.tier === "trial" && "체험판"}
                {status.tier === "pro" && "프로"}
              </span>
              {status.tier !== "free" && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                  {status.daysUntilExpiration !== null &&
                    `${status.daysUntilExpiration}일 남음`}
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 bg-white rounded-2xl shadow-sm border-2 border-gray-200"
          >
            <div className="mb-4">
              <h3 className="text-xl font-bold mb-2">무료</h3>
              <div className="text-3xl font-bold mb-1">₩0</div>
              <div className="text-sm text-gray-500">영구 무료</div>
            </div>
            <ul className="space-y-3 mb-6">
              {freeFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            {status?.tier === "free" && (
              <div className="text-center text-sm text-gray-500 py-2">
                현재 플랜
              </div>
            )}
          </motion.div>

          {/* Trial Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`p-6 bg-white rounded-2xl shadow-sm border-2 ${
              status?.tier === "trial"
                ? "border-blue-500"
                : "border-gray-200"
            }`}
          >
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-blue-500" />
                <h3 className="text-xl font-bold">무료 체험</h3>
              </div>
              <div className="text-3xl font-bold mb-1">₩0</div>
              <div className="text-sm text-gray-500">7일 무료</div>
            </div>
            <ul className="space-y-3 mb-6">
              {trialFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            {status?.tier === "trial" ? (
              <div className="text-center text-sm text-blue-600 py-2 font-medium">
                체험 중
              </div>
            ) : status?.tier === "free" ? (
              <button
                onClick={startTrial}
                disabled={actionLoading}
                className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
              >
                {actionLoading ? "처리 중..." : "체험 시작"}
              </button>
            ) : (
              <div className="text-center text-sm text-gray-500 py-2">
                이미 사용함
              </div>
            )}
          </motion.div>

          {/* Pro Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl shadow-lg border-2 ${
              status?.tier === "pro"
                ? "border-yellow-500"
                : "border-yellow-300"
            }`}
          >
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-yellow-600" />
                <h3 className="text-xl font-bold">프로</h3>
              </div>
              <div className="text-3xl font-bold mb-1">₩9,900</div>
              <div className="text-sm text-gray-600">월 구독</div>
            </div>
            <ul className="space-y-3 mb-6">
              {proFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                  <span className="text-sm font-medium">{feature}</span>
                </li>
              ))}
            </ul>
            {status?.tier === "pro" ? (
              <div className="text-center text-sm text-yellow-700 py-2 font-bold">
                현재 플랜
              </div>
            ) : (
              <button
                onClick={upgradeToPro}
                disabled={actionLoading}
                className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg font-bold hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 shadow-md"
              >
                {actionLoading ? "처리 중..." : "프로 업그레이드"}
              </button>
            )}
          </motion.div>
        </div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 p-6 bg-blue-50 rounded-2xl"
        >
          <h3 className="font-bold mb-2">안내사항</h3>
          <ul className="text-sm text-gray-700 space-y-2">
            <li>• 무료 체험은 한 번만 이용 가능합니다</li>
            <li>• 프로 구독은 월 단위로 자동 갱신됩니다</li>
            <li>• 구독은 언제든지 취소할 수 있습니다</li>
            <li>• 무료 플랜에서도 핵심 기능을 모두 사용하실 수 있습니다</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
