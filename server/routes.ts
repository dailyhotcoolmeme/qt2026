import type { Express } from "express";
import { createServer, type Server } from "http";
import { supabaseStorage } from "./supabaseStorage";
import { uploadAudioToR2, uploadFileToR2, checkAudioExistsInR2, getR2PublicUrl, deleteAudioFromR2 } from "./r2";

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

  // /api/auth/user 엔드포인트 추가 (클라이언트 호환성)
  app.get("/api/auth/user", (req, res) => {
    const userId = getUserId(req);
    res.json(userId ? { id: userId } : null);
  });

  // R2 오디오 업로드
  app.post("/api/audio/upload", async (req, res) => {
    try {
      const { fileName, audioBase64 } = req.body;
      
      if (!fileName || !audioBase64) {
        return res.status(400).json({ 
          success: false, 
          error: "fileName과 audioBase64가 필요합니다" 
        });
      }

      // Base64 디코딩
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      
      // R2에 업로드
      const result = await uploadAudioToR2(fileName, audioBuffer, 'audio/mp3');
      
      res.json(result);
    } catch (error) {
      console.error('Audio upload error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "업로드 실패" 
      });
    }
  });

  // R2 일반 파일 업로드 (이미지 포함)
  app.post("/api/file/upload", async (req, res) => {
    try {
      const { fileName, fileBase64, contentType } = req.body;

      if (!fileName || !fileBase64) {
        return res.status(400).json({
          success: false,
          error: "fileName과 fileBase64가 필요합니다",
        });
      }

      const fileBuffer = Buffer.from(fileBase64, "base64");
      const result = await uploadFileToR2(fileName, fileBuffer, contentType || "application/octet-stream");

      res.json(result);
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "업로드 실패",
      });
    }
  });

  // R2 오디오 URL 가져오기
  app.get("/api/audio/:fileName", async (req, res) => {
    try {
      const { fileName } = req.params;
      
      // 파일 존재 확인
      const exists = await checkAudioExistsInR2(fileName);
      
      if (!exists) {
        return res.status(404).json({ 
          success: false, 
          error: "파일이 존재하지 않습니다" 
        });
      }

      // Public URL 반환
      const publicUrl = getR2PublicUrl(fileName);
      
      res.json({ 
        success: true, 
        publicUrl 
      });
    } catch (error) {
      console.error('Audio fetch error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "조회 실패" 
      });
    }
  });

  // R2 오디오 파일 삭제
  app.delete("/api/audio/delete", async (req, res) => {
    try {
      const { fileUrl } = req.body;
      
      if (!fileUrl) {
        return res.status(400).json({ 
          success: false, 
          error: "fileUrl이 필요합니다" 
        });
      }

      console.log('R2 삭제 요청:', fileUrl);

      // Public URL에서 파일명 추출
      // 예: https://pub-xxx.r2.dev/audio/meditation/user_id/2026-02-09/qt_123.mp3
      // -> audio/meditation/user_id/2026-02-09/qt_123.mp3
      let fileName = '';
      
      try {
        const url = new URL(fileUrl);
        // pathname은 /audio/meditation/... 형태
        fileName = url.pathname.substring(1); // 첫 번째 / 제거
      } catch (e) {
        // URL 파싱 실패 시 기존 방식 사용
        fileName = fileUrl.split('/').slice(3).join('/');
      }
      
      console.log('추출된 파일명:', fileName);
      
      // R2에서 삭제
      const result = await deleteAudioFromR2(fileName);
      
      console.log('R2 삭제 결과:', result);
      
      res.json(result);
    } catch (error) {
      console.error('Audio delete error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "삭제 실패" 
      });
    }
  });

  // 기도 녹음 STT (로컬 개발용 - 모의 응답)
  app.post("/api/prayer/transcribe", async (req, res) => {
    try {
      const { audioUrl } = req.body;
      
      if (!audioUrl) {
        return res.status(400).json({ 
          success: false, 
          error: "audioUrl이 필요합니다" 
        });
      }

      // 로컬 개발 환경에서는 모의 응답 반환
      // 실제 Vercel 배포에서는 api/prayer/transcribe.js가 처리함
      console.log('STT 요청 (로컬 개발 - 모의 응답):', audioUrl);
      
      res.json({
        success: true,
        transcription: "하나님, 오늘도 감사드립니다. 이 기도를 들어주소서.",
        keywords: [
          { word: "하나님", count: 5 },
          { word: "감사", count: 3 },
          { word: "기도", count: 2 }
        ]
      });
    } catch (error) {
      console.error('Prayer transcribe error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "STT 처리 실패" 
      });
    }
  });

  // R2 파일 이동 (로컬 개발용 - 모의 응답)
  app.post("/api/audio/move", async (req, res) => {
    try {
      const { sourceUrl, targetPath } = req.body;
      
      if (!sourceUrl || !targetPath) {
        return res.status(400).json({ 
          success: false, 
          error: "sourceUrl과 targetPath가 필요합니다" 
        });
      }

      console.log('R2 파일 이동 요청 (로컬 개발 - 모의 응답)');
      console.log('Source:', sourceUrl);
      console.log('Target:', targetPath);
      
      // 모의 Public URL 생성
      const publicUrl = `https://pub-mock.r2.dev/${targetPath}`;
      
      res.json({
        success: true,
        publicUrl
      });
    } catch (error) {
      console.error('Audio move error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "파일 이동 실패" 
      });
    }
  });

  return httpServer;
}
