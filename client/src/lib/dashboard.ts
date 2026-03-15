import { fetchMyGroups, type MyGroupLite } from "./group-activity";
import { supabase } from "./supabase";

export type DashboardRole = "member" | "leader" | "scope_leader";
export type DashboardScope = "managed" | "scope";
export type TimeframeDays = 7 | 30 | 90;

export type DashboardAccessProfile = {
  role: DashboardRole;
  managed_group_ids: string[];
  managed_group_count: number;
  scope_root_group_ids: string[];
  scope_root_group_count: number;
  scope_group_ids: string[];
  scope_group_count: number;
  joined_group_ids: string[];
  joined_group_count: number;
};

export type PersonalDailyPoint = {
  date: string;
  label: string;
  qt: number;
  prayer: number;
  reading: number;
  bookmark: number;
  total: number;
};

export type RecentActivityItem = {
  id: string;
  title: string;
  description: string;
  type: "qt" | "prayer" | "reading" | "bookmark";
  occurredAt: string;
};

export type PersonalDashboardData = {
  totals: {
    qt: number;
    prayer: number;
    reading: number;
    bookmark: number;
    total: number;
    streak: number;
    activeDays: number;
    consistencyRate: number;
  };
  daily: PersonalDailyPoint[];
  recent: RecentActivityItem[];
  groups: MyGroupLite[];
};

export type GroupKpi = {
  group_id: string;
  group_name: string;
  depth: number;
  member_count: number;
  pending_requests: number;
  prayer_records: number;
  faith_records: number;
  post_count: number;
  linked_activities: number;
};

export type GroupTimelinePoint = {
  bucket_date: string;
  label: string;
  prayer_records: number;
  faith_records: number;
  post_count: number;
  linked_activities: number;
};

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function toDateKey(dateLike: Date | string) {
  const date = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDateBuckets(days: number) {
  const count = Math.max(days, 1);
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const current = new Date(today);
    current.setDate(today.getDate() - offset);
    dates.push(current);
  }

  return dates;
}

function computeActivityStreak(dateKeys: Set<string>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;

  while (true) {
    const probe = new Date(today);
    probe.setDate(today.getDate() - streak);
    const key = toDateKey(probe);
    if (!dateKeys.has(key)) break;
    streak += 1;
  }

  return streak;
}

function describeRecentActivity(type: RecentActivityItem["type"], payload: Record<string, any>) {
  if (type === "qt") {
    return payload.meditation_excerpt || payload.prayer_excerpt || "묵상 기록을 남겼습니다.";
  }
  if (type === "prayer") {
    return payload.title || "기도 기록을 남겼습니다.";
  }
  if (type === "reading") {
    const bookName = payload.book_name || "성경";
    const chapter = payload.chapter ? ` ${payload.chapter}장` : "";
    const verses =
      payload.start_verse && payload.end_verse
        ? ` ${payload.start_verse}-${payload.end_verse}절`
        : "";
    return `${bookName}${chapter}${verses}`.trim() || "읽기 완료를 기록했습니다.";
  }
  return payload.verse_ref || "말씀을 저장했습니다.";
}

function titleForActivity(type: RecentActivityItem["type"]) {
  if (type === "qt") return "QT 묵상";
  if (type === "prayer") return "기도 기록";
  if (type === "reading") return "성경 읽기";
  return "말씀 저장";
}

function parseAccessProfile(raw: any): DashboardAccessProfile {
  return {
    role: (raw?.role || "member") as DashboardRole,
    managed_group_ids: Array.isArray(raw?.managed_group_ids) ? raw.managed_group_ids : [],
    managed_group_count: Number(raw?.managed_group_count || 0),
    scope_root_group_ids: Array.isArray(raw?.scope_root_group_ids) ? raw.scope_root_group_ids : [],
    scope_root_group_count: Number(raw?.scope_root_group_count || 0),
    scope_group_ids: Array.isArray(raw?.scope_group_ids) ? raw.scope_group_ids : [],
    scope_group_count: Number(raw?.scope_group_count || 0),
    joined_group_ids: Array.isArray(raw?.joined_group_ids) ? raw.joined_group_ids : [],
    joined_group_count: Number(raw?.joined_group_count || 0),
  };
}

export async function fetchDashboardAccessProfile() {
  const { data, error } = await supabase.rpc("get_dashboard_access_profile");
  if (error) throw error;
  return parseAccessProfile(data);
}

export async function fetchPersonalDashboardData(userId: string, days: TimeframeDays): Promise<PersonalDashboardData> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const sinceIso = start.toISOString();

  const [{ data: activityLogs, error: activityError }, { data: bookmarks, error: bookmarkError }, groups] = await Promise.all([
    supabase
      .from("activity_logs")
      .select("id, activity_type, occurred_at, payload")
      .eq("user_id", userId)
      .gte("occurred_at", sinceIso)
      .order("occurred_at", { ascending: false })
      .limit(300),
    supabase
      .from("verse_bookmarks")
      .select("id, created_at, verse_ref")
      .eq("user_id", userId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(120),
    fetchMyGroups(userId),
  ]);

  if (activityError) throw activityError;
  if (bookmarkError) throw bookmarkError;

  const dailyMap = new Map<string, PersonalDailyPoint>();
  buildDateBuckets(days).forEach((date) => {
    const key = toDateKey(date);
    dailyMap.set(key, {
      date: key,
      label: formatShortDate(date),
      qt: 0,
      prayer: 0,
      reading: 0,
      bookmark: 0,
      total: 0,
    });
  });

  const recent: RecentActivityItem[] = [];

  (activityLogs ?? []).forEach((row: any) => {
    const type = row.activity_type as RecentActivityItem["type"];
    const key = toDateKey(row.occurred_at);
    const point = dailyMap.get(key);
    if (point && (type === "qt" || type === "prayer" || type === "reading" || type === "bookmark")) {
      point[type] += 1;
      point.total += 1;
    }

    if (recent.length < 8 && (type === "qt" || type === "prayer" || type === "reading" || type === "bookmark")) {
      recent.push({
        id: `${row.id}`,
        title: titleForActivity(type),
        description: describeRecentActivity(type, row.payload || {}),
        type,
        occurredAt: row.occurred_at,
      });
    }
  });

  (bookmarks ?? []).forEach((row: any) => {
    const key = toDateKey(row.created_at);
    const point = dailyMap.get(key);
    if (point) {
      point.bookmark += 1;
      point.total += 1;
    }

    if (recent.length < 8) {
      recent.push({
        id: `bookmark-${row.id}`,
        title: titleForActivity("bookmark"),
        description: row.verse_ref || "말씀을 저장했습니다.",
        type: "bookmark",
        occurredAt: row.created_at,
      });
    }
  });

  recent.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  const daily = Array.from(dailyMap.values());
  const activeDateKeys = new Set(daily.filter((item) => item.total > 0).map((item) => item.date));
  const totals = daily.reduce(
    (acc, item) => {
      acc.qt += item.qt;
      acc.prayer += item.prayer;
      acc.reading += item.reading;
      acc.bookmark += item.bookmark;
      acc.total += item.total;
      return acc;
    },
    { qt: 0, prayer: 0, reading: 0, bookmark: 0, total: 0 },
  );

  const activeDays = activeDateKeys.size;
  const streak = computeActivityStreak(activeDateKeys);
  const consistencyRate = days > 0 ? Math.round((activeDays / days) * 100) : 0;

  return {
    totals: {
      ...totals,
      streak,
      activeDays,
      consistencyRate,
    },
    daily,
    recent: recent.slice(0, 8),
    groups,
  };
}

export async function fetchDashboardGroupKpis(scope: DashboardScope, days: TimeframeDays) {
  const { data, error } = await supabase.rpc("get_dashboard_group_kpis", {
    p_days: days,
    p_scope: scope,
  });
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => ({
    group_id: row.group_id,
    group_name: row.group_name,
    depth: Number(row.depth || 0),
    member_count: Number(row.member_count || 0),
    pending_requests: Number(row.pending_requests || 0),
    prayer_records: Number(row.prayer_records || 0),
    faith_records: Number(row.faith_records || 0),
    post_count: Number(row.post_count || 0),
    linked_activities: Number(row.linked_activities || 0),
  })) as GroupKpi[];
}

export async function fetchDashboardGroupTimeline(scope: DashboardScope, days: TimeframeDays) {
  const { data, error } = await supabase.rpc("get_dashboard_group_timeline", {
    p_days: days,
    p_scope: scope,
  });
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => ({
    bucket_date: row.bucket_date,
    label: formatShortDate(new Date(row.bucket_date)),
    prayer_records: Number(row.prayer_records || 0),
    faith_records: Number(row.faith_records || 0),
    post_count: Number(row.post_count || 0),
    linked_activities: Number(row.linked_activities || 0),
  })) as GroupTimelinePoint[];
}
