import { z } from 'zod';
import { insertMeditationSchema, insertWordShareSchema, dailyVerses, meditations, wordShares, users } from './schema';

export const api = {
  verses: {
    getDaily: {
      method: 'GET' as const,
      path: '/api/verses/daily',
      responses: {
        200: z.object({
          word: z.custom<typeof dailyVerses.$inferSelect>().optional(),
          qt: z.custom<typeof dailyVerses.$inferSelect>().optional(),
        }),
      },
    },
  },
  meditations: {
    create: {
      method: 'POST' as const,
      path: '/api/meditations',
      input: insertMeditationSchema.omit({ userId: true }),
      responses: {
        201: z.custom<typeof meditations.$inferSelect>(),
        401: z.object({ message: z.string() }),
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/meditations',
      responses: {
        200: z.array(z.custom<typeof meditations.$inferSelect>()),
        401: z.object({ message: z.string() }),
      },
    },
  },
  shares: {
    create: {
      method: 'POST' as const,
      path: '/api/shares',
      input: insertWordShareSchema.omit({ userId: true }),
      responses: {
        201: z.custom<typeof wordShares.$inferSelect>(),
        401: z.object({ message: z.string() }),
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/shares',
      responses: {
        200: z.array(z.object({
          share: z.custom<typeof wordShares.$inferSelect>(),
          author: z.string().optional(),
        })),
      },
    },
  },
  auth: {
    me: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<typeof users.$inferSelect>().nullable(),
      },
    },
  },
  subscription: {
    getStatus: {
      method: 'GET' as const,
      path: '/api/subscription/status',
      responses: {
        200: z.object({
          tier: z.enum(['free', 'trial', 'pro']),
          features: z.object({
            canAccessDailyVerse: z.boolean(),
            canAccessReading: z.boolean(),
            canAccessPrayer: z.boolean(),
            canShareMeditation: z.boolean(),
            canAccessCommunity: z.boolean(),
            canAccessAdvancedFeatures: z.boolean(),
            canUploadAudio: z.boolean(),
            canAccessArchive: z.boolean(),
            maxMeditationsPerDay: z.number(),
            maxWordSharesPerDay: z.number(),
          }),
          daysUntilExpiration: z.number().nullable(),
        }),
        401: z.object({ message: z.string() }),
      },
    },
    startTrial: {
      method: 'POST' as const,
      path: '/api/subscription/trial',
      responses: {
        200: z.object({
          message: z.string(),
          expiresAt: z.string(),
        }),
        400: z.object({ message: z.string() }),
        401: z.object({ message: z.string() }),
      },
    },
    upgradeToPro: {
      method: 'POST' as const,
      path: '/api/subscription/upgrade',
      responses: {
        200: z.object({
          message: z.string(),
          expiresAt: z.string(),
        }),
        401: z.object({ message: z.string() }),
      },
    },
  }
};
