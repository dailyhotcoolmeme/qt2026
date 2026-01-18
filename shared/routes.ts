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
  }
};
