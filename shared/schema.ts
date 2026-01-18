import { pgTable, text, serial, integer, boolean, timestamp, date, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === 1. USERS TABLE (자체 회원가입용으로 변경) ===
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(), // 아이디 (중복확인 필수)
  password: text("password").notNull(),          // 비밀번호
  nickname: text("nickname").notNull().unique(), // 닉네임 (중복확인 필수)
  
  // 선택 항목 (null 허용)
  fullName: text("full_name"),                   // 이름
  phoneNumber: text("phone_number"),             // 핸드폰번호
  email: text("email"),                          // 이메일
  church: text("church"),                        // 교회
  rank: text("rank"),                            // 직분
  
  bibleCompleteCount: integer("bible_complete_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// === 2. OTHER TABLES ===
export const dailyVerses = pgTable("daily_verses", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  reference: text("reference").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(), 
});

export const meditations = pgTable("meditations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // serial ID와 맞추기 위해 integer로 변경
  content: text("content").notNull(),
  type: text("type").notNull(),
  isAudio: boolean("is_audio").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wordShares = pgTable("word_shares", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // serial ID와 맞추기 위해 integer로 변경
  content: text("content").notNull(),
  isAnonymous: boolean("is_anonymous").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// === 3. SCHEMAS (데이터 검증용) ===
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true,
  bibleCompleteCount: true 
});

export const insertDailyVerseSchema = createInsertSchema(dailyVerses).omit({ id: true });
export const insertMeditationSchema = createInsertSchema(meditations).omit({ id: true, createdAt: true });
export const insertWordShareSchema = createInsertSchema(wordShares).omit({ id: true, createdAt: true });

// === 4. TYPES ===
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type DailyVerse = typeof dailyVerses.$inferSelect;
export type InsertDailyVerse = z.infer<typeof insertDailyVerseSchema>;

export type Meditation = typeof meditations.$inferSelect;
export type InsertMeditation = z.infer<typeof insertMeditationSchema>;

export type WordShare = typeof wordShares.$inferSelect;
export type InsertWordShare = z.infer<typeof insertWordShareSchema>;