import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-user-id");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // GET: 현재 유저 정보 반환 (기존 기능)
  if (req.method === "GET") {
    const userId = req.headers["x-user-id"] || null;
    return res.json(userId ? { id: userId } : null);
  }

  // DELETE: 회원탈퇴
  if (req.method === "DELETE") {
    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "인증이 필요합니다" });
    }

    const token = authHeader.slice(7);

    try {
      // 1. 유저 JWT 검증 (push API와 동일한 패턴: anonKey로 getUser 호출)
      const authClient = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data, error: userError } = await authClient.auth.getUser(token);
      if (userError || !data?.user) {
        return res.status(401).json({ message: "유효하지 않은 토큰입니다" });
      }

      const userId = data.user.id;

      // 2. Admin REST API로 유저 삭제 (service role key 사용)
      const deleteRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
      });

      if (!deleteRes.ok) {
        const errBody = await deleteRes.text();
        console.error("[API] 회원탈퇴 실패:", deleteRes.status, errBody);
        return res.status(500).json({
          message: "회원탈퇴에 실패했습니다",
          detail: `${deleteRes.status}: ${errBody}`,
        });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("[API] 회원탈퇴 오류:", error);
      return res.status(500).json({ message: `서버 오류: ${error.message}` });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
