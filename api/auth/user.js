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

      // 2. Kakao 연동 해제 (탈퇴 후 자동 재가입 방지)
      // - Kakao Admin Key로 unlink API 호출 → 다음 로그인 시 동의 화면 다시 표시
      const kakaoAdminKey = process.env.KAKAO_ADMIN_KEY;
      const kakaoIdentity = data.user.identities?.find((i) => i.provider === "kakao");
      // identity.id는 Supabase 내부 UUID일 수 있으므로 identity_data.sub 사용 (실제 Kakao 숫자 ID)
      const kakaoUserId = kakaoIdentity?.identity_data?.sub ?? kakaoIdentity?.id;

      if (kakaoUserId && kakaoAdminKey) {
        try {
          const unlinkRes = await fetch("https://kapi.kakao.com/v1/user/unlink", {
            method: "POST",
            headers: {
              Authorization: `KakaoAK ${kakaoAdminKey}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `target_id_type=user_id&target_id=${kakaoUserId}`,
          });
          if (unlinkRes.ok) {
            console.log("[API] Kakao 연동 해제 성공, kakaoUserId:", kakaoUserId, "(from:", kakaoIdentity?.identity_data?.sub ? "identity_data.sub" : "identity.id", ")");
          } else {
            const errText = await unlinkRes.text();
            // 비치명적: 실패해도 Supabase 삭제는 계속 진행
            console.warn("[API] Kakao unlink 실패 (비치명적):", unlinkRes.status, errText);
          }
        } catch (unlinkErr) {
          console.warn("[API] Kakao unlink 오류 (비치명적):", unlinkErr.message);
        }
      } else if (!kakaoAdminKey) {
        console.warn("[API] KAKAO_ADMIN_KEY 환경변수 없음 - Kakao 연동 해제 생략");
      }
      // 2-a. 유저가 소유한 그룹 모두 삭제 (FK 제약 해소)
      // groups.owner_id → auth.users.id FK 때문에 유저 삭제 전 그룹 먼저 삭제해야 함
      const adminClient = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // 소유한 그룹 목록 조회
      const { data: ownedGroups } = await adminClient
        .from("groups")
        .select("id")
        .eq("owner_id", userId);

      if (ownedGroups && ownedGroups.length > 0) {
        const groupIds = ownedGroups.map((g) => g.id);

        // delete_group_hard RPC와 동일한 순서로 자식 테이블 삭제
        await adminClient.from("activity_group_links").delete().in("group_id", groupIds);
        await adminClient.from("group_faith_records").delete().in("group_id", groupIds);
        await adminClient.from("group_faith_items").delete().in("group_id", groupIds);
        await adminClient.from("group_prayer_records").delete().in("group_id", groupIds);
        await adminClient.from("group_prayer_topics").delete().in("group_id", groupIds);
        // group_post_images는 group_posts.id를 참조하므로 posts 먼저 조회
        const { data: groupPosts } = await adminClient
          .from("group_posts")
          .select("id")
          .in("group_id", groupIds);
        if (groupPosts && groupPosts.length > 0) {
          const postIds = groupPosts.map((p) => p.id);
          await adminClient.from("group_post_images").delete().in("post_id", postIds);
        }
        await adminClient.from("group_posts").delete().in("group_id", groupIds);
        await adminClient.from("group_join_requests").delete().in("group_id", groupIds);
        await adminClient.from("group_scope_leaders").delete().in("root_group_id", groupIds);
        for (const gid of groupIds) {
          await adminClient.from("group_edges").delete().or(`parent_group_id.eq.${gid},child_group_id.eq.${gid}`);
        }
        await adminClient.from("group_members").delete().in("group_id", groupIds);

        // 그룹 삭제
        const { error: groupDeleteError } = await adminClient
          .from("groups")
          .delete()
          .in("id", groupIds);
        if (groupDeleteError) {
          console.error("[API] 소유 그룹 삭제 실패:", groupDeleteError.message);
          return res.status(500).json({
            message: "그룹 삭제 중 오류가 발생했습니다",
            detail: groupDeleteError.message,
          });
        }
        console.log(`[API] 소유 그룹 ${groupIds.length}개 삭제 완료`);
      }

      // 2-b. 다른 그룹의 멤버 레코드 제거 (group_members.user_id → auth.users.id FK 가능성)
      await adminClient.from("group_members").delete().eq("user_id", userId);


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
