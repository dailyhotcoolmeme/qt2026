import type { Express } from "express";
import { createServer, type Server } from "http";
import { supabaseStorage } from "./supabaseStorage";

// Replit 인증 대신 Supabase 사용자를 판별하도록 수정
function getUserId(req: any): string | null {
  // 클라이언트에서 보낸 헤더나 세션 정보를 우선 확인합니다.
  return req.headers['x-user-id'] as string || req.user?.id || null;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Replit 전용 인증 로직 주석 처리 (Vercel 에러 방지)
  // await setupAuth(app);
  // registerAuthRoutes(app);

  app.get("/api/verses/daily", async (req, res) => {
    const today = new Date().toISOString().split('T')[0]; // 에러 방지를 위해 변수 선언 복구
    res.json({
      word: {
        id: 1,
        date: today,
        reference: "창세기 1:1",
        content: "태초에 하나님이 천지를 창조하시니라",
        type: "word",
      },
      qt: {
        id: 2,
        date: today,
        reference: "민수기 6:24-27",
        content: "여호와는 네게 복을 주시고 너를 지키시기를 원하며 여호와는 그의 얼굴을 네게 비추사 은혜 베푸시기를 원하며 여호와는 그 얼굴을 네게로 향하여 드사 평강 주시기를 원하노라",
        type: "qt",
      },
    });
  });

  app.get("/api/word-comments", async (req, res) => {
    try {
      const comments = await supabaseStorage.getTodayWordComments();
      res.json(comments);
    } catch (error) {
      console.error('Error fetching word comments:', error);
      res.json([]);
    }
  });

  app.post("/api/word-comments", async (req, res) => {
    // req.isAuthenticated() 대신 getUserId 체크로 변경
    if (!getUserId(req)) {
      return res.status(401).json({ message: "로그인이 필요합니다" });
    }

    const { content, isAnonymous } = req.body;
    if (!content) {
      return res.status(400).json({ message: "내용을 입력해주세요" });
    }

    try {
      const comment = await supabaseStorage.createWordComment(
        getUserId(req)!,
        content,
        isAnonymous || false
      );
      res.status(201).json(comment);
    } catch (error) {
      console.error('Error creating word comment:', error);
      res.status(500).json({ message: "저장에 실패했습니다" });
    }
  });

  app.get("/api/meditations", async (req, res) => {
    const contentType = req.query.type as 'record' | 'prayer' | undefined;
    try {
      const meditations = await supabaseStorage.getTodayMeditations(contentType);
      res.json(meditations);
    } catch (error) {
      console.error('Error fetching meditations:', error);
      res.json([]);
    }
  });

  app.get("/api/meditations/my", async (req, res) => {
    if (!getUserId(req)) {
      return res.status(401).json({ message: "로그인이 필요합니다" });
    }

    try {
      const meditations = await supabaseStorage.getUserMeditations(getUserId(req)!);
      res.json(meditations);
    } catch (error) {
      console.error('Error fetching user meditations:', error);
      res.json([]);
    }
  });

  app.post("/api/meditations", async (req, res) => {
    if (!getUserId(req)) {
      return res.status(401).json({ message: "로그인이 필요합니다" });
    }

    const { content, contentType, isPublic, isAnonymous } = req.body;
    if (!content || !contentType) {
      return res.status(400).json({ message: "내용과 유형을 입력해주세요" });
    }

    try {
      const meditation = await supabaseStorage.createMeditation(
        getUserId(req)!,
        content,
        contentType,
        isPublic ?? true,
        isAnonymous ?? false
      );
      res.status(201).json(meditation);
    } catch (error) {
      console.error('Error creating meditation:', error);
      res.status(500).json({ message: "저장에 실패했습니다" });
    }
  });

  app.get("/api/bible-progress", async (req, res) => {
    if (!getUserId(req)) {
      return res.status(401).json({ message: "로그인이 필요합니다" });
    }

    try {
      const progress = await supabaseStorage.getBibleProgress(getUserId(req)!);
      res.json(progress);
    } catch (error) {
      console.error('Error fetching bible progress:', error);
      res.json([]);
    }
  });

  app.post("/api/bible-progress/mark", async (req, res) => {
    if (!getUserId(req)) {
      return res.status(401).json({ message: "로그인이 필요합니다" });
    }

    const { bookName, chapterNumber } = req.body;
    if (!bookName || !chapterNumber) {
      return res.status(400).json({ message: "책과 장을 지정해주세요" });
    }

    try {
      await supabaseStorage.markChapterRead(getUserId(req)!, bookName, chapterNumber);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking chapter read:', error);
      res.status(500).json({ message: "저장에 실패했습니다" });
    }
  });

  app.post("/api/bible-progress/unmark", async (req, res) => {
    if (!getUserId(req)) {
      return res.status(401).json({ message: "로그인이 필요합니다" });
    }

    const { bookName, chapterNumber } = req.body;
    if (!bookName || !chapterNumber) {
      return res.status(400).json({ message: "책과 장을 지정해주세요" });
    }

    try {
      await supabaseStorage.unmarkChapterRead(getUserId(req)!, bookName, chapterNumber);
      res.json({ success: true });
    } catch (error) {
      console.error('Error unmarking chapter read:', error);
      res.status(500).json({ message: "저장에 실패했습니다" });
    }
  });

  app.post("/api/bible-progress/reset", async (req, res) => {
    if (!getUserId(req)) {
      return res.status(401).json({ message: "로그인이 필요합니다" });
    }

    try {
      await supabaseStorage.resetBibleProgress(getUserId(req)!);
      await supabaseStorage.incrementCompletionCount(getUserId(req)!);
      res.json({ success: true });
    } catch (error) {
      console.error('Error resetting bible progress:', error);
      res.status(500).json({ message: "초기화에 실패했습니다" });
    }
  });

  app.get("/api/user/profile", async (req, res) => {
    if (!getUserId(req)) {
      return res.status(401).json({ message: "로그인이 필요합니다" });
    }

    try {
      const user = await supabaseStorage.getUser(getUserId(req)!);
      res.json(user);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ message: "프로필을 불러오지 못했습니다" });
    }
  });

  app.put("/api/user/profile", async (req, res) => {
    if (!getUserId(req)) {
      return res.status(401).json({ message: "로그인이 필요합니다" });
    }

    const { nickname, church, rank, age_group } = req.body;

    try {
      const user = await supabaseStorage.updateUser(getUserId(req)!, {
        nickname,
        church,
        rank,
        age_group,
      });
      res.json(user);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ message: "프로필 수정에 실패했습니다" });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    const userId = getUserId(req);
    res.json(userId ? { id: userId } : null);
  });

  return httpServer;
}