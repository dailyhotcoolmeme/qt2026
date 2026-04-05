import React, { useState, useEffect, useCallback } from "react";

// ── 타입 ──────────────────────────────────────────────────────────

interface DailyTrendItem { date: string; events: number; dau: number; }
interface RecentEvent { menu: string; action: string; metadata: unknown; platform: string; created_at: string; user_id: string | null; }
interface StatsData {
  dau: number; wau: number; totalUsers: number; todayEvents: number;
  menuCounts: Record<string, number>; actionCounts: Record<string, Record<string, number>>;
  platformCounts: Record<string, number>; recentEvents: RecentEvent[]; dailyTrend: DailyTrendItem[];
}
interface UserItem {
  id: string; username: string | null; nickname: string | null; avatar_url: string | null;
  email: string | null; auth_provider: string | null; last_browser: string | null;
  created_at: string; is_admin: boolean; totalEvents: number; dau: number; wau: number; lastEventAt: string | null; topMenu: string | null;
  groups: { id: string; name: string }[];
  prayerTopicCount: number;
  push_enabled: boolean | null;
}
interface PrayerTopic {
  id: number; content: string; created_at: string;
  groups: { id: string; name: string } | null;
}
interface UserStats {
  profile: UserItem | null;
  menuCounts: Record<string, number>;
  actionCounts: Record<string, Record<string, number>>;
  recentEvents: RecentEvent[];
}

// ── 상수 ──────────────────────────────────────────────────────────

const MENU_LABELS: Record<string, string> = {
  home: "오늘말씀", reading: "성경읽기", qt: "QT일기",
  prayer: "매일기도", group: "중보모임", hamburger: "햄버거메뉴",
};
const MENU_ORDER = ["home", "reading", "qt", "prayer", "group", "hamburger"];
const menuLabel = (k: string) => MENU_LABELS[k] || k;

const ACTION_LABELS: Record<string, string> = {
  // 오늘말씀
  amen: "아멘", copy: "복사", share: "공유", favorite_toggle: "즐겨찾기", card_create: "말씀카드 생성",
  // QT일기
  audio_play: "음성 재생", audio_stop: "음성 중지", audio_complete: "음성 완료",
  meditation_start: "묵상 시작", meditation_save: "묵상 저장", meditation_edit: "묵상 수정", meditation_delete: "묵상 삭제",
  voice_record_start: "음성 녹음 시작", voice_record_save: "음성 녹음 저장",
  // 성경읽기
  reading_complete: "성경 완독",
  // 매일기도
  topic_add: "기도제목 추가", topic_delete: "기도제목 삭제",
  voice_start: "기도 녹음 시작", voice_save: "기도 녹음 저장",
  group_connect: "중보모임 연결", silent_prayer: "묵상기도",
  // 중보모임
  schedule_add: "일정 추가", schedule_view: "일정 보기",
  prayer_add: "기도 추가", prayer_react: "기도 반응",
  faith_filter: "믿음 필터", image_attach: "이미지 첨부",
  post_create: "게시글 작성", comment_create: "댓글 작성", member_invite: "멤버 초대",
  // 햄버거메뉴
  card_download: "말씀카드 저장", card_share: "말씀카드 공유", card_delete: "말씀카드 삭제",
  favorite_copy: "즐겨찾기 복사", favorite_share: "즐겨찾기 공유", favorite_delete: "즐겨찾기 삭제",
};
const actionLabel = (k: string) => ACTION_LABELS[k] || k;

const BROWSER_LABELS: Record<string, string> = {
  kakaotalk: '카카오톡', samsung: '삼성인터넷', chrome: 'Chrome',
  safari: 'Safari', firefox: 'Firefox', edge: 'Edge', opera: 'Opera',
  ios: 'iOS앱', android: 'Android앱', web: 'Web',
};
const browserLabel = (k: string | null) => k ? (BROWSER_LABELS[k] || k) : '-';

function formatKST(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false })
      .replace(/\. /g, "-").replace(".", "");
  } catch { return dateStr; }
}
function formatDate(dateStr: string) {
  try { return new Date(dateStr).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }); }
  catch { return dateStr; }
}
function formatDateFull(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul", hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      weekday: "short", hour: "2-digit", minute: "2-digit",
    });
  } catch { return dateStr; }
}
function metaStr(meta: unknown): string {
  if (!meta || (typeof meta === "object" && Object.keys(meta as object).length === 0)) return "-";
  try { return JSON.stringify(meta); } catch { return String(meta); }
}

// ── 공용 컴포넌트 ─────────────────────────────────────────────────

function BarChart({ data, labelMap }: { data: { key: string; value: number }[]; labelMap?: (k: string) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.key} className="flex items-center gap-3">
          <span className="w-24 text-right text-sm text-gray-600 shrink-0 truncate">{labelMap ? labelMap(item.key) : item.key}</span>
          <div className="flex-1 bg-gray-100 rounded overflow-hidden h-6">
            <div className="h-full bg-blue-500 rounded transition-all duration-500" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          <span className="w-12 text-right text-sm font-semibold text-gray-700 shrink-0">{item.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function DailyTrendChart({ trend }: { trend: DailyTrendItem[] }) {
  const recent = trend.slice(-30);
  const maxEvents = Math.max(...recent.map((d) => d.events), 1);
  return (
    <div>
      <div className="flex items-end gap-0.5 h-28 overflow-x-auto pb-1">
        {recent.map((item) => (
          <div key={item.date} className="flex flex-col items-center flex-1 min-w-[18px]"
            title={`${item.date}\n이벤트: ${item.events}\nDAU: ${item.dau}`}>
            <div className="w-full flex flex-col justify-end" style={{ height: 96 }}>
              <div className="w-full bg-blue-400 rounded-t hover:bg-blue-600 transition-colors"
                style={{ height: `${Math.max(2, (item.events / maxEvents) * 88)}px` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
        <span>{recent[0]?.date?.slice(5) || ""}</span>
        <span>{recent[recent.length - 1]?.date?.slice(5) || ""}</span>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col items-center gap-1">
      <span className="text-3xl font-bold text-blue-600">{typeof value === "number" ? value.toLocaleString() : value}</span>
      <span className="text-sm text-gray-500">{label}</span>
    </div>
  );
}

function Spinner() {
  return <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />;
}

// ── 로그인 화면 ───────────────────────────────────────────────────

function LoginForm({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json() as { token?: string };
      if (!res.ok || !data.token) { setError("아이디 또는 비밀번호가 올바르지 않습니다"); return; }
      sessionStorage.setItem("admin_token", data.token);
      onLogin(data.token);
    } catch { setError("서버 연결 오류가 발생했습니다"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">myAmen 관리자</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoComplete="username" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoComplete="current-password" required />
          </div>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-2 rounded-lg text-sm">
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── 기도제목 모달 ─────────────────────────────────────────────────

function PrayerTopicsModal({ user, token, onClose }: {
  user: UserItem; token: string; onClose: () => void;
}) {
  const [topics, setTopics] = useState<PrayerTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/users/${user.id}/prayer-topics`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setTopics(Array.isArray(d) ? d as PrayerTopic[] : []))
      .finally(() => setLoading(false));
  }, [user.id, token]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <h3 className="font-bold text-gray-800 text-lg">
            {user.nickname || user.username || "사용자"}의 중보기도 제목
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">×</button>
        </div>
        <div className="overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="py-8 text-center"><Spinner /></div>
          ) : topics.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">등록된 기도제목이 없습니다</p>
          ) : topics.map((t) => (
            <div key={t.id} className="border border-gray-100 rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs bg-green-50 text-green-700 border border-green-100 rounded px-2 py-0.5">
                  {t.groups?.name || "모임 미상"}
                </span>
                <span className="text-xs text-gray-400">{formatDateFull(t.created_at)}</span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{t.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 사용자 수정 모달 ──────────────────────────────────────────────

function EditUserModal({ user, token, onClose, onSaved }: {
  user: UserItem; token: string; onClose: () => void; onSaved: () => void;
}) {
  const [displayName, setDisplayName] = useState(user.nickname || "");
  const [isAdmin, setIsAdmin] = useState(user.is_admin);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nickname: displayName, is_admin: isAdmin }),
      });
      if (!res.ok) { setError("저장 실패"); return; }
      onSaved();
    } catch { setError("네트워크 오류"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-800 text-lg">사용자 수정</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">표시 이름</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} className="rounded" />
          <span className="text-sm text-gray-700">관리자 권한</span>
        </label>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">취소</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-blue-500 text-white rounded-lg py-2 text-sm font-semibold disabled:bg-blue-300 hover:bg-blue-600">
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 사용자별 통계 뷰 ──────────────────────────────────────────────

function UserStatsView({ userId, token, onBack }: { userId: string; token: string; onBack: () => void }) {
  const [data, setData] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/users/${userId}/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        setData(d as UserStats);
        const first = MENU_ORDER.find((k) => (d as UserStats).menuCounts[k]) || Object.keys((d as UserStats).menuCounts)[0];
        if (first) setSelectedMenu(first);
      })
      .finally(() => setLoading(false));
  }, [userId, token]);

  if (loading) return <div className="py-20 text-center"><Spinner /></div>;
  if (!data) return <div className="py-20 text-center text-gray-400">데이터 없음</div>;

  const p = data.profile;
  const menuChartData = MENU_ORDER.filter((k) => data.menuCounts[k])
    .map((k) => ({ key: k, value: data.menuCounts[k] }))
    .concat(Object.keys(data.menuCounts).filter((k) => !MENU_ORDER.includes(k)).map((k) => ({ key: k, value: data.menuCounts[k] })));
  const actionData = selectedMenu ? Object.entries(data.actionCounts[selectedMenu] || {})
    .sort(([, a], [, b]) => b - a).map(([key, value]) => ({ key, value })) : [];
  const menuTabs = [...new Set([...MENU_ORDER.filter((k) => data.menuCounts[k]), ...Object.keys(data.menuCounts).filter((k) => !MENU_ORDER.includes(k))])];

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
        ← 사용자 목록
      </button>

      {/* 프로필 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
        {p?.avatar_url
          ? <img src={p.avatar_url} className="w-14 h-14 rounded-full object-cover" />
          : <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-400">
              {(p?.nickname || p?.username || "?")[0].toUpperCase()}
            </div>
        }
        <div>
          <div className="font-bold text-gray-800 text-lg">{p?.nickname || p?.username || "이름 없음"}</div>
          <div className="text-sm text-gray-400">가입: {p ? formatDate(p.created_at) : "-"}</div>
          {p?.is_admin && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">관리자</span>}
        </div>
        <div className="ml-auto text-center">
          <div className="text-2xl font-bold text-blue-600">{data.recentEvents.length}</div>
          <div className="text-xs text-gray-400">최근 이벤트</div>
        </div>
      </div>

      {/* 메뉴 사용 현황 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4">메뉴 사용 현황</h3>
          {menuChartData.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">데이터 없음</p>
            : <BarChart data={menuChartData} labelMap={menuLabel} />}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3">메뉴별 액션 상세</h3>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {menuTabs.map((k) => (
              <button key={k} onClick={() => setSelectedMenu(k)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedMenu === k ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {menuLabel(k)}
              </button>
            ))}
          </div>
          {actionData.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">데이터 없음</p>
            : <BarChart data={actionData} labelMap={actionLabel} />}
        </div>
      </div>

      {/* 최근 이벤트 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 mb-4">최근 이벤트 (최대 30개)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="pb-2 pr-3 font-medium whitespace-nowrap">시간</th>
                <th className="pb-2 pr-3 font-medium">메뉴</th>
                <th className="pb-2 pr-3 font-medium">액션</th>
                <th className="pb-2 pr-3 font-medium">플랫폼</th>
                <th className="pb-2 font-medium">메타</th>
              </tr>
            </thead>
            <tbody>
              {data.recentEvents.length === 0
                ? <tr><td colSpan={5} className="text-center text-gray-400 py-4">데이터 없음</td></tr>
                : data.recentEvents.map((ev, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-1.5 pr-3 whitespace-nowrap text-gray-400">{formatKST(ev.created_at)}</td>
                    <td className="py-1.5 pr-3 text-gray-700">{menuLabel(ev.menu)}</td>
                    <td className="py-1.5 pr-3 text-gray-700">{actionLabel(ev.action)}</td>
                    <td className="py-1.5 pr-3 text-gray-400 capitalize">{ev.platform || "web"}</td>
                    <td className="py-1.5 text-gray-400 max-w-xs truncate">{metaStr(ev.metadata)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── 사용자 관리 탭 ────────────────────────────────────────────────

function UsersTab({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<UserItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [prayerUser, setPrayerUser] = useState<UserItem | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true); setFetchError(null);
    try {
      const res = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { onLogout(); return; }
      const data = await res.json() as any;
      if (!res.ok || !Array.isArray(data)) {
        setFetchError(JSON.stringify(data));
        setUsers([]);
      } else {
        setUsers(data as UserItem[]);
      }
    } finally { setLoading(false); }
  }, [token, onLogout]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteConfirm.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { setDeleteConfirm(null); loadUsers(); }
    } finally { setDeleting(false); }
  };

  if (selectedUserId) {
    return <UserStatsView userId={selectedUserId} token={token} onBack={() => setSelectedUserId(null)} />;
  }

  if (loading) return <div className="py-20 text-center"><Spinner /></div>;
  if (fetchError) return (
    <div className="py-10 space-y-2">
      <p className="text-red-500 text-sm font-semibold">사용자 목록 로드 실패</p>
      <pre className="text-xs bg-gray-100 rounded p-3 overflow-auto max-h-40">{fetchError}</pre>
      <button onClick={loadUsers} className="text-sm text-blue-600 border border-blue-300 px-3 py-1.5 rounded-lg">다시 시도</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">전체 {users.length}명</span>
        <button onClick={loadUsers} className="text-sm text-blue-600 border border-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-50">새로고침</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium">이름</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">아이디</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">이메일</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">가입루트</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">브라우저</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap text-center">알림</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">모임</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">가입일</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">마지막 활동</th>
                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">DAU</th>
                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">WAU</th>
                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">MAU</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.avatar_url
                        ? <img src={u.avatar_url} className="w-7 h-7 rounded-full object-cover shrink-0" />
                        : <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">
                            {(u.nickname || u.username || "?")[0].toUpperCase()}
                          </div>
                      }
                      <div>
                        <div className="font-medium text-gray-800 truncate max-w-[120px]">{u.nickname || u.username || "이름없음"}</div>
                        {u.is_admin && <span className="text-xs text-blue-500">관리자</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{u.username || "-"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{u.email || "-"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{u.auth_provider || "-"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{browserLabel(u.last_browser)}</td>
                  <td className="px-4 py-3 text-center">
                    {u.push_enabled === true ? (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 border border-green-200" title="알림 ON">ON</span>
                    ) : u.push_enabled === false ? (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-500 border border-red-200" title="알림 OFF">OFF</span>
                    ) : (
                      <span className="text-gray-300 text-xs" title="알림 설정 없음">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {u.groups?.length ? u.groups.map((g) => (
                      <span key={g.id} className="inline-block bg-green-50 text-green-700 border border-green-100 rounded px-1.5 py-0.5 mr-1 mb-0.5 whitespace-nowrap">{g.name}</span>
                    )) : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">{formatDateFull(u.created_at)}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">{u.lastEventAt ? formatDateFull(u.lastEventAt) : "-"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700">{u.dau || 0}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700">{u.wau || 0}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700">{u.totalEvents || 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      {u.prayerTopicCount > 0 && (
                        <button onClick={() => setPrayerUser(u)} title={`기도제목 ${u.prayerTopicCount}개`}
                          className="px-2 py-1 text-xs text-amber-600 border border-amber-200 rounded hover:bg-amber-50 flex items-center gap-1">
                          📋 {u.prayerTopicCount}
                        </button>
                      )}
                      <button onClick={() => setSelectedUserId(u.id)}
                        className="px-2 py-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50">통계</button>
                      <button onClick={() => setEditUser(u)}
                        className="px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50">수정</button>
                      <button onClick={() => setDeleteConfirm(u)}
                        className="px-2 py-1 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50">삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 기도제목 모달 */}
      {prayerUser && (
        <PrayerTopicsModal user={prayerUser} token={token} onClose={() => setPrayerUser(null)} />
      )}

      {/* 수정 모달 */}
      {editUser && (
        <EditUserModal user={editUser} token={token} onClose={() => setEditUser(null)}
          onSaved={() => { setEditUser(null); loadUsers(); }} />
      )}

      {/* 삭제 확인 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-gray-800">사용자 삭제</h3>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">{deleteConfirm.nickname || deleteConfirm.username}</span> 사용자를 삭제하시겠습니까?
              <br /><span className="text-red-500 text-xs">모든 데이터가 삭제되며 복구할 수 없습니다.</span>
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">취소</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm font-semibold disabled:bg-red-300 hover:bg-red-600">
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 대시보드 탭 ───────────────────────────────────────────────────

function DashboardTab({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { onLogout(); return; }
      if (!res.ok) { setError("데이터를 불러오지 못했습니다"); return; }
      const data = await res.json() as StatsData;
      setStats(data);
      if (!selectedMenu) {
        const first = MENU_ORDER.find((k) => data.menuCounts[k]) || Object.keys(data.menuCounts)[0];
        if (first) setSelectedMenu(first);
      }
    } catch { setError("네트워크 오류"); }
    finally { setLoading(false); }
  }, [token, onLogout]);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (loading) return <div className="py-20 text-center"><Spinner /></div>;
  if (error) return (
    <div className="py-20 text-center space-y-3">
      <p className="text-red-500">{error}</p>
      <button onClick={loadStats} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">다시 시도</button>
    </div>
  );
  if (!stats) return null;

  const menuChartData = MENU_ORDER.filter((k) => stats.menuCounts[k] !== undefined).map((k) => ({ key: k, value: stats.menuCounts[k] }))
    .concat(Object.keys(stats.menuCounts).filter((k) => !MENU_ORDER.includes(k)).map((k) => ({ key: k, value: stats.menuCounts[k] })));
  const totalPlatform = Object.values(stats.platformCounts).reduce((a, b) => a + b, 0) || 1;
  const platformChartData = Object.entries(stats.platformCounts).sort(([, a], [, b]) => b - a).map(([key, value]) => ({ key, value }));
  const selectedActions = selectedMenu ? stats.actionCounts[selectedMenu] || {} : {};
  const actionChartData = Object.entries(selectedActions).sort(([, a], [, b]) => b - a).map(([key, value]) => ({ key, value }));
  const menuTabList = [...new Set([...MENU_ORDER.filter((k) => stats.menuCounts[k] !== undefined || stats.actionCounts[k]),
    ...Object.keys(stats.menuCounts).filter((k) => !MENU_ORDER.includes(k))])];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={loadStats} className="text-sm text-blue-600 border border-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-50">새로고침</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="DAU (오늘)" value={stats.dau} />
        <StatCard label="WAU (7일)" value={stats.wau} />
        <StatCard label="전체 사용자" value={stats.totalUsers} />
        <StatCard label="오늘 이벤트" value={stats.todayEvents} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-700 mb-4">일별 이벤트 트렌드 (최근 30일)</h2>
        {stats.dailyTrend.length === 0
          ? <p className="text-gray-400 text-sm text-center py-6">데이터 없음</p>
          : <DailyTrendChart trend={stats.dailyTrend} />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-4">메뉴 사용 현황 (30일)</h2>
          {menuChartData.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">데이터 없음</p>
            : <BarChart data={menuChartData} labelMap={menuLabel} />}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-3">메뉴별 액션 상세</h2>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {menuTabList.map((key) => (
              <button key={key} onClick={() => setSelectedMenu(key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedMenu === key ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {menuLabel(key)}
              </button>
            ))}
          </div>
          {actionChartData.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">데이터 없음</p>
            : <BarChart data={actionChartData} labelMap={actionLabel} />}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-700 mb-4">플랫폼 분포 (30일)</h2>
        {platformChartData.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">데이터 없음</p>
          : <div className="space-y-3">
            {platformChartData.map(({ key, value }) => {
              const pct = Math.round((value / totalPlatform) * 100);
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-16 text-right text-sm text-gray-600 shrink-0 capitalize">{key}</span>
                  <div className="flex-1 bg-gray-100 rounded overflow-hidden h-6">
                    <div className="h-full bg-green-400 rounded transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-20 text-right text-sm text-gray-600 shrink-0">{value.toLocaleString()} ({pct}%)</span>
                </div>
              );
            })}
          </div>}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-700 mb-4">최근 이벤트 50개</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="pb-2 pr-3 font-medium whitespace-nowrap">시간</th>
                <th className="pb-2 pr-3 font-medium">메뉴</th>
                <th className="pb-2 pr-3 font-medium">액션</th>
                <th className="pb-2 pr-3 font-medium">플랫폼</th>
                <th className="pb-2 font-medium">메타데이터</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentEvents.length === 0
                ? <tr><td colSpan={5} className="text-center text-gray-400 py-4">데이터 없음</td></tr>
                : stats.recentEvents.map((ev, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-1.5 pr-3 whitespace-nowrap text-gray-400">{formatKST(ev.created_at)}</td>
                    <td className="py-1.5 pr-3 text-gray-700">{menuLabel(ev.menu)}</td>
                    <td className="py-1.5 pr-3 text-gray-700">{actionLabel(ev.action)}</td>
                    <td className="py-1.5 pr-3 text-gray-400 capitalize">{ev.platform || "web"}</td>
                    <td className="py-1.5 text-gray-400 max-w-xs truncate">{metaStr(ev.metadata)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── 메인 대시보드 ─────────────────────────────────────────────────

function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [tab, setTab] = useState<"dashboard" | "users">("dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">myAmen 관리자</h1>
        <button onClick={onLogout} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">로그아웃</button>
      </div>

      {/* 탭 */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-6 px-4">
          {(["dashboard", "users"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t === "dashboard" ? "대시보드" : "사용자 관리"}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full px-6 py-6">
        {tab === "dashboard"
          ? <DashboardTab token={token} onLogout={onLogout} />
          : <UsersTab token={token} onLogout={onLogout} />}
      </div>
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(() => {
    try { return sessionStorage.getItem("admin_token"); } catch { return null; }
  });

  if (!token) return <LoginForm onLogin={(t) => setToken(t)} />;
  return <Dashboard token={token} onLogout={() => { try { sessionStorage.removeItem("admin_token"); } catch {} setToken(null); }} />;
}
