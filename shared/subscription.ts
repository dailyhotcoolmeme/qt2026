import { User } from "./schema";

export type SubscriptionTier = "free" | "trial" | "pro";

export interface SubscriptionFeatures {
  // 기본 기능
  canAccessDailyVerse: boolean;
  canAccessReading: boolean;
  canAccessPrayer: boolean;
  
  // 커뮤니티 기능
  canShareMeditation: boolean;
  canAccessCommunity: boolean;
  
  // 프리미엄 기능
  canAccessAdvancedFeatures: boolean;
  canUploadAudio: boolean;
  canAccessArchive: boolean;
  
  // 제한
  maxMeditationsPerDay: number;
  maxWordSharesPerDay: number;
}

// UI에서 표시할 기능 설명 (프리미엄 기능을 포함한 전체 목록)
export const FEATURE_DESCRIPTIONS = {
  free: [
    "매일 말씀 읽기",
    "성경 통독",
    "기도 기록 (하루 3개)",
    "묵상 나눔 (하루 3개)",
  ],
  trial: [
    "매일 말씀 읽기",
    "성경 통독",
    "기도 기록 (하루 3개)",
    "묵상 나눔 (하루 3개)",
    "커뮤니티 접근",
    "고급 기능 사용",
    "음성 녹음 기능",
    "아카이브 접근",
    "기도/묵상 (하루 10개)",
  ],
  pro: [
    "매일 말씀 읽기",
    "성경 통독",
    "기도 기록 (하루 3개)",
    "묵상 나눔 (하루 3개)",
    "커뮤니티 접근",
    "모든 고급 기능",
    "음성 녹음 무제한",
    "아카이브 전체 접근",
    "기도/묵상 무제한",
    "우선 지원",
  ],
};

/**
 * 사용자의 구독 상태를 확인합니다
 * 
 * Note: 이 함수는 만료된 구독을 감지하면 'free'를 반환하지만 데이터베이스의 subscriptionTier 필드를
 * 업데이트하지 않습니다. 이는 백엔드에서 별도의 배치 작업으로 처리되어야 합니다.
 * 또는 API 호출 시 현재 유효한 구독 상태를 확인하여 만료된 경우 업데이트할 수 있습니다.
 */
export function getUserSubscriptionTier(user: User): SubscriptionTier {
  const tier = user.subscriptionTier as SubscriptionTier || "free";
  const now = new Date();
  
  // Pro 구독 확인
  if (tier === "pro") {
    if (user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > now) {
      return "pro";
    }
  }
  
  // Trial 구독 확인
  if (tier === "trial") {
    if (user.trialExpiresAt && new Date(user.trialExpiresAt) > now) {
      return "trial";
    }
  }
  
  // 기본값은 free
  return "free";
}

/**
 * 구독 티어별 기능을 반환합니다
 */
export function getSubscriptionFeatures(tier: SubscriptionTier): SubscriptionFeatures {
  switch (tier) {
    case "pro":
      return {
        canAccessDailyVerse: true,
        canAccessReading: true,
        canAccessPrayer: true,
        canShareMeditation: true,
        canAccessCommunity: true,
        canAccessAdvancedFeatures: true,
        canUploadAudio: true,
        canAccessArchive: true,
        maxMeditationsPerDay: -1, // 무제한
        maxWordSharesPerDay: -1,  // 무제한
      };
    
    case "trial":
      return {
        canAccessDailyVerse: true,
        canAccessReading: true,
        canAccessPrayer: true,
        canShareMeditation: true,
        canAccessCommunity: true,
        canAccessAdvancedFeatures: true,
        canUploadAudio: true,
        canAccessArchive: true,
        maxMeditationsPerDay: 10,
        maxWordSharesPerDay: 10,
      };
    
    case "free":
    default:
      return {
        canAccessDailyVerse: true,
        canAccessReading: true,
        canAccessPrayer: true,
        canShareMeditation: true,
        canAccessCommunity: false,
        canAccessAdvancedFeatures: false,
        canUploadAudio: false,
        canAccessArchive: false,
        maxMeditationsPerDay: 3,
        maxWordSharesPerDay: 3,
      };
  }
}

/**
 * 사용자가 특정 기능을 사용할 수 있는지 확인합니다
 */
export function canUserAccessFeature(
  user: User,
  feature: keyof SubscriptionFeatures
): boolean {
  const tier = getUserSubscriptionTier(user);
  const features = getSubscriptionFeatures(tier);
  return features[feature] as boolean;
}

/**
 * 구독 만료까지 남은 날짜를 반환합니다
 */
export function getDaysUntilExpiration(user: User): number | null {
  const tier = getUserSubscriptionTier(user);
  const now = new Date();
  
  if (tier === "pro" && user.subscriptionExpiresAt) {
    const diff = new Date(user.subscriptionExpiresAt).getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  
  if (tier === "trial" && user.trialExpiresAt) {
    const diff = new Date(user.trialExpiresAt).getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  
  return null;
}

/**
 * 무료 체험을 시작합니다 (7일)
 */
export function getTrialExpirationDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 7); // 7일 무료 체험
  return date;
}

/**
 * Pro 구독 만료일을 계산합니다 (1개월)
 */
export function getProExpirationDate(): Date {
  const date = new Date();
  // 월말 경계 케이스 처리를 위해 일수를 더하는 방식 사용
  date.setDate(date.getDate() + 30); // 30일 (약 1개월)
  return date;
}
