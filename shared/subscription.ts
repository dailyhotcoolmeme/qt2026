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

/**
 * 사용자의 구독 상태를 확인합니다
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
  date.setMonth(date.getMonth() + 1); // 1개월
  return date;
}
