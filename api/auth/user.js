import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: '인증이 필요합니다' });
    }

    const token = authHeader.slice(7);

    try {
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // JWT로 실제 유저 확인
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        return res.status(401).json({ message: '유효하지 않은 토큰입니다' });
      }

      // admin API로 유저 삭제 (auth.users → profiles CASCADE 삭제)
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error('[API] 회원탈퇴 오류:', deleteError);
        return res.status(500).json({ message: '회원탈퇴에 실패했습니다' });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error('[API] 회원탈퇴 서버 오류:', error);
      return res.status(500).json({ message: '서버 오류가 발생했습니다' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
