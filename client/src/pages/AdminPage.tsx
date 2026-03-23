import React, { useState, useEffect, useCallback } from "react";

// ── 타입 정의 ────────────────────────────────────────────────────

interface DailyTrendItem {
  date: string;
  events: number;
  dau: number;
}

interface RecentEvent {
  menu: string;
  action: string;
  metadata: unknown;
  platform: string;
  created_at: string;
  user_id: string | null;
}

interface StatsData {
  dau: number;
  wau: number;
  totalUsers: number;
  todayEvents: number;
  menuCounts: Record<string, number>;
  actionCounts: Record<string, Record<string, number>>;
  platformCounts: Record<string, number>;
  recentEvents: RecentEvent[];
  dailyTrend: DailyTrendItem[];
}

// ── 상수 ─────────────────────────────────────────────────────────

const MENU_LABELS: Record<string, string> = {
  home: "오늘말씀",
  reading: "성경읽기",
  qt: "QT일기",
  prayer: "매일기도",
  group: "중보모임",
  hamburger: "햄버거메뉴",
};

const MENU_LABEL_ORDER = ["home", "reading", "qt", "prayer", "group", "hamburger"];

function menuLabel(key: string) {
  return MENU_LABELS[key] || key;
}

function formatKST(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false }).replace(/\. /g, "-").replace(".", "");
  } catch {
    return dateStr;
  }
}

function metaStr(meta: unknown): string {
  if (!meta) return "-";
  if (typeof meta === "string") return meta;
  try {
    return JSON.stringify(meta);
  } catch {
    return String(meta);
  }
}

// ── 막대 차트 컴포넌트 ────────────────────────────────────────────

function BarChart({ data, labelKey, valueKey, labelMap }: {
  data: { key: string; value: number }[];
  labelKey?: string;
  valueKey?: string;
  labelMap?: (k: string) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.key} className="flex items-center gap-3">
          <span className="w-20 text-right text-sm text-gray-600 shrink-0">
            {labelMap ? labelMap(item.key) : item.key}
          </span>
          <div className="flex-1 bg-gray-100 rounded overflow-hidden h-6 relative">
            <div
              className="h-full bg-blue-500 rounded transition-all duration-500"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
          <span className="w-12 text-right text-sm font-semibold text-gray-700 shrink-0">
            {item.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function DailyTrendChart({ trend }: { trend: DailyTrendItem[] }) {
  const maxEvents = Math.max(...trend.map((d) => d.events), 1);
  const recent = trend.slice(-30);

  return (
    <div>
      <div className="flex items-end gap-0.5 h-28 overflow-x-auto pb-1">
        {recent.map((item) => (
          <div
            key={item.date}
            className="flex flex-col items-center gap-0.5 flex-1 min-w-[18px]"
            title={`${item.date}\n이벤트: ${item.events}\nDAU: ${item.dau}`}
          >
            <div className="w-full flex flex-col justify-end" style={{ height: "96px" }}>
              <div
                className="w-full bg-blue-400 rounded-t hover:bg-blue-600 transition-colors cursor-default"
                style={{ height: `${Math.max(2, (item.events / maxEvents) * 88)}px` }}
              />
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

// ── 숫자 카드 ─────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col items-center gap-1">
      <span className="text-3xl font-bold text-blue-600">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      <span className="text-sm text-gray-500">{label}</span>
    </div>
  );
}

// ── 로그인 화면 ───────────────────────────────────────────────────

function LoginForm({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json() as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setError("아이디 또는 비밀번호가 올바르지 않습니다");
        return;
      }
      sessionStorage.setItem("admin_token", data.token);
      onLogin(data.token);
    } catch {
      setError("서버 연결 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">myAmen 관리자</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="아이디 입력"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="비밀번호 입력"
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── 대시보드 ──────────────────────────────────────────────────────

function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (!res.ok) {
        setError("데이터를 불러오지 못했습니다");
        return;
      }
      const data = await res.json() as StatsData;
      setStats(data);
      if (!selectedMenu) {
        const firstMenu = MENU_LABEL_ORDER.find((k) => data.menuCounts[k]) || Object.keys(data.menuCounts)[0];
        if (firstMenu) setSelectedMenu(firstMenu);
      }
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }, [token, onLogout]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-red-500">{error}</p>
          <button
            onClick={loadStats}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // 메뉴 차트 데이터 (순서 정렬)
  const menuChartData = MENU_LABEL_ORDER
    .filter((k) => stats.menuCounts[k] !== undefined)
    .map((k) => ({ key: k, value: stats.menuCounts[k] }))
    .concat(
      Object.keys(stats.menuCounts)
        .filter((k) => !MENU_LABEL_ORDER.includes(k))
        .map((k) => ({ key: k, value: stats.menuCounts[k] }))
    );

  // 플랫폼 차트 데이터
  const totalPlatform = Object.values(stats.platformCounts).reduce((a, b) => a + b, 0) || 1;
  const platformChartData = Object.entries(stats.platformCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([key, value]) => ({ key, value }));

  // 선택된 메뉴의 액션 목록
  const selectedActions = selectedMenu ? stats.actionCounts[selectedMenu] || {} : {};
  const actionChartData = Object.entries(selectedActions)
    .sort(([, a], [, b]) => b - a)
    .map(([key, value]) => ({ key, value }));

  const menuTabList = MENU_LABEL_ORDER
    .filter((k) => stats.menuCounts[k] !== undefined || stats.actionCounts[k])
    .concat(
      Object.keys(stats.menuCounts).filter((k) => !MENU_LABEL_ORDER.includes(k))
    );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 헤더 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">myAmen 관리자</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={loadStats}
            className="px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
          >
            새로고침
          </button>
          <button
            onClick={onLogout}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* 숫자 카드 4개 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="DAU (오늘)" value={stats.dau} />
          <StatCard label="WAU (7일)" value={stats.wau} />
          <StatCard label="전체 사용자" value={stats.totalUsers} />
          <StatCard label="오늘 이벤트" value={stats.todayEvents} />
        </div>

        {/* 일별 트렌드 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-4">일별 이벤트 트렌드 (최근 30일)</h2>
          {stats.dailyTrend.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">데이터 없음</p>
          ) : (
            <DailyTrendChart trend={stats.dailyTrend} />
          )}
        </div>

        {/* 메뉴 사용 현황 + 액션 상세 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-700 mb-4">메뉴 사용 현황 (30일)</h2>
            {menuChartData.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">데이터 없음</p>
            ) : (
              <BarChart data={menuChartData} labelMap={menuLabel} />
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-700 mb-3">메뉴별 액션 상세</h2>
            {/* 탭 */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {menuTabList.map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedMenu(key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedMenu === key
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {menuLabel(key)}
                </button>
              ))}
            </div>
            {actionChartData.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">데이터 없음</p>
            ) : (
              <BarChart data={actionChartData} />
            )}
          </div>
        </div>

        {/* 플랫폼 분포 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-4">플랫폼 분포 (30일)</h2>
          {platformChartData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">데이터 없음</p>
          ) : (
            <div className="space-y-3">
              {platformChartData.map(({ key, value }) => {
                const pct = Math.round((value / totalPlatform) * 100);
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-16 text-right text-sm text-gray-600 shrink-0 capitalize">{key}</span>
                    <div className="flex-1 bg-gray-100 rounded overflow-hidden h-6 relative">
                      <div
                        className="h-full bg-green-400 rounded transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-20 text-right text-sm text-gray-600 shrink-0">
                      {value.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 최근 이벤트 50개 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-4">최근 이벤트 50개</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-2 pr-3 whitespace-nowrap font-medium">시간</th>
                  <th className="pb-2 pr-3 whitespace-nowrap font-medium">메뉴</th>
                  <th className="pb-2 pr-3 whitespace-nowrap font-medium">액션</th>
                  <th className="pb-2 pr-3 whitespace-nowrap font-medium">플랫폼</th>
                  <th className="pb-2 font-medium">메타데이터</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-400 py-4">데이터 없음</td>
                  </tr>
                ) : (
                  stats.recentEvents.map((ev, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-1.5 pr-3 whitespace-nowrap text-gray-500">{formatKST(ev.created_at)}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap text-gray-700">{menuLabel(ev.menu)}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap text-gray-700">{ev.action}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap text-gray-500 capitalize">{ev.platform || "web"}</td>
                      <td className="py-1.5 text-gray-400 max-w-xs truncate">{metaStr(ev.metadata)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem("admin_token");
    } catch {
      return null;
    }
  });

  const handleLogin = (newToken: string) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem("admin_token");
    } catch { /* ignore */ }
    setToken(null);
  };

  if (!token) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return <Dashboard token={token} onLogout={handleLogout} />;
}
