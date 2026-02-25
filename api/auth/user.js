export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: 현재 유저 정보 반환 (기존 기능)
  if (req.method === 'GET') {
    const userId = req.headers['x-user-id'] || null;
    return res.json(userId ? { id: userId } : null);
  }

  // DELETE: 회원탈퇴
  if (req.method === 'DELETE') {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: '인증이 필요합니다' });
    }

    const token = authHeader.slice(7);

    try {
      // 1. JWT로 유저 정보 확인 (Supabase Auth REST API 직접 호출)
      const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: serviceRoleKey,
        },
      });

      if (!userRes.ok) {
        return res.status(401).json({ message: '유효하지 않은 토큰입니다' });
      }

      const userData = await userRes.json();
      const userId = userData.id;

      if (!userId) {
        return res.status(401).json({ message: '유저 정보를 확인할 수 없습니다' });
      }

      // 2. Admin API로 유저 삭제 (auth.users → profiles CASCADE 삭제)
      const deleteRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      });

      if (!deleteRes.ok) {
        const errBody = await deleteRes.json().catch(() => ({}));
        console.error('[API] 회원탈퇴 실패:', errBody);
        return res.status(500).json({ message: '회원탈퇴에 실패했습니다' });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error('[API] 회원탈퇴 서버 오류:', error);
      return res.status(500).json({ message: `서버 오류: ${error.message}` });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
