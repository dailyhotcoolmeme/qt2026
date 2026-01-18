import { db } from "./db";
import {
  users, dailyVerses, meditations, wordShares,
  type User, type InsertUser,
  type DailyVerse, type InsertDailyVerse,
  type Meditation, type InsertMeditation,
  type WordShare, type InsertWordShare
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User
  getUser(id: string): Promise<User | undefined>; // Changed to string
  getUserByUsername(username: string): Promise<User | undefined>;
  // createUser(user: InsertUser): Promise<User>; // Handled by Auth storage

  // Daily Verses
  getDailyVerses(date: string): Promise<{ word?: DailyVerse, qt?: DailyVerse }>;
  createDailyVerse(verse: InsertDailyVerse): Promise<DailyVerse>;

  // Meditations
  createMeditation(meditation: InsertMeditation): Promise<Meditation>;
  getMeditations(userId: string): Promise<Meditation[]>; // Changed to string

  // Shares
  createWordShare(share: InsertWordShare): Promise<WordShare>;
  getWordShares(): Promise<(WordShare & { author?: string })[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Replit Auth users might not have a 'username' field in the same way, 
    // they usually have email. But 'users' table has 'email'.
    // The original schema had 'username'. The auth model has 'email'.
    // Let's assume we search by email if needed, or remove this if unused.
    // For safety, I'll comment out or adjust if 'username' doesn't exist on auth model.
    // Auth model: id, email, firstName, lastName, profileImageUrl...
    // It does NOT have 'username'. 
    
    // So let's return undefined or search by email if strictly needed.
    // But for now, let's just use email if the method is called, assuming 'username' param is actually email.
    const [user] = await db.select().from(users).where(eq(users.email, username));
    return user;
  }

  // createUser is handled by Replit Auth's storage.ts, so we might not need it here explicitly
  // unless we want to manually create users (which conflicts with auth flow).
  // I will remove it from here to avoid confusion, or leave it as a wrapper.
  
  async getDailyVerses(date: string): Promise<{ word?: DailyVerse, qt?: DailyVerse }> {
    const verses = await db.select().from(dailyVerses).where(eq(dailyVerses.date, date));
    return {
      word: verses.find(v => v.type === 'word'),
      qt: verses.find(v => v.type === 'qt'),
    };
  }

  async createDailyVerse(verse: InsertDailyVerse): Promise<DailyVerse> {
    const [newVerse] = await db.insert(dailyVerses).values(verse).returning();
    return newVerse;
  }

  async createMeditation(meditation: InsertMeditation): Promise<Meditation> {
    const [newMeditation] = await db.insert(meditations).values(meditation).returning();
    return newMeditation;
  }

  async getMeditations(userId: string): Promise<Meditation[]> {
    return await db.select().from(meditations)
      .where(eq(meditations.userId, userId))
      .orderBy(desc(meditations.createdAt));
  }

  async createWordShare(share: InsertWordShare): Promise<WordShare> {
    const [newShare] = await db.insert(wordShares).values(share).returning();
    return newShare;
  }

  async getWordShares(): Promise<(WordShare & { author?: string })[]> {
    const results = await db.select({
      share: wordShares,
      user: users,
    })
    .from(wordShares)
    .leftJoin(users, eq(wordShares.userId, users.id))
    .orderBy(desc(wordShares.createdAt));

    return results.map(({ share, user }) => ({
      ...share,
      author: share.isAnonymous ? 'Anonymous' : (user?.firstName || 'Unknown'), // Use firstName as display name
    }));
  }
}

export const storage = new DatabaseStorage();
