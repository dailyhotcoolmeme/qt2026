import { supabase } from "./supabase";

export type TimeframeDays = 7 | 30 | 90;
export type DashboardContextKind = "personal" | "network" | "group";
export type DashboardNetworkMode = "managed" | "scope";
export type DashboardGroupRole = "member" | "leader" | "owner";
export type DashboardActivityType = "qt" | "prayer" | "reading" | "bookmark";
export type DashboardActivitySourceKind = "personal" | "group_direct";

export type DashboardGroupContext = {
  id: string;
  name: string;
  role: DashboardGroupRole;
  isScopeRoot: boolean;
  isScopeGroup: boolean;
  scopeDepth: number | null;
};

export type DashboardContexts = {
  groups: DashboardGroupContext[];
  managedGroups: DashboardGroupContext[];
  scopeGroups: Array<Pick<DashboardGroupContext, "id" | "name" | "scopeDepth">>;
  scopeRoots: Array<{ id: string; name: string; canManage: boolean }>;
  summary: {
    joinedGroupCount: number;
    managedGroupCount: number;
    scopeGroupCount: number;
    scopeRootCount: number;
    hasNetworkAccess: boolean;
    hasScopeAccess: boolean;
  };
};

export type DashboardActivityLink = {
  id: string;
  name: string;
};

export type DashboardActivityItem = {
  id: string;
  type: DashboardActivityType;
  occurredAt: string;
  sourceKind: DashboardActivitySourceKind;
  sourceTable: string;
  sourceRowId: string;
  sourceGroupId: string | null;
  sourceGroupName: string | null;
  title: string;
  summary: string;
  reference: string | null;
  audioUrl: string | null;
  audioDuration: number;
  linkedGroups: DashboardActivityLink[];
};

export type DashboardDailyPoint = {
  date: string;
  label: string;
  qt: number;
  prayer: number;
  reading: number;
  bookmark: number;
  total: number;
};

export type DashboardHeatmapCell = {
  date: string;
  label: string;
  total: number;
  level: 0 | 1 | 2 | 3 | 4;
};

export type DashboardMixItem = {
  key: DashboardActivityType;
  label: string;
  value: number;
  color: string;
};

export type DashboardPatternPoint = {
  label: string;
  total: number;
};

export type PersonalDashboardData = {
  totals: {
    total: number;
    activeDays: number;
    streak: number;
    linkedCount: number;
    groupDirectCount: number;
    groupTiedRate: number;
  };
  daily: DashboardDailyPoint[];
  heatmap: DashboardHeatmapCell[];
  mix: DashboardMixItem[];
  weekdayPattern: DashboardPatternPoint[];
  timePattern: DashboardPatternPoint[];
  linkedGroups: Array<{ id: string; name: string; count: number }>;
  recent: DashboardActivityItem[];
  highlights: {
    strongestLabel: string;
    weakestLabel: string;
    bestWeekdayLabel: string;
    bestTimeLabel: string;
  };
};

export type GroupMemberMomentum = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: DashboardGroupRole;
  total: number;
  linked: number;
  prayer: number;
  faith: number;
  posts: number;
};

export type PendingJoinRequest = {
  id: string;
  name: string;
  createdAt: string;
};

export type GroupDashboardData = {
  group: DashboardGroupContext;
  canManage: boolean;
  summary: {
    myTotal: number;
    groupTotal: number;
    linkedCount: number;
    directCount: number;
    shareRate: number;
    activeDays: number;
    streak: number;
    activeContributorCount: number;
    memberCount: number | null;
    pendingCount: number;
  };
  daily: Array<DashboardDailyPoint & { groupTotal: number; linkedTotal: number; directTotal: number }>;
  mix: DashboardMixItem[];
  recent: DashboardActivityItem[];
  leaderboard: GroupMemberMomentum[];
  inactiveMembers: GroupMemberMomentum[];
  pendingRequests: PendingJoinRequest[];
};

export type NetworkGroupCard = {
  id: string;
  name: string;
  depth: number;
  memberCount: number;
  pendingCount: number;
  prayerCount: number;
  faithCount: number;
  postCount: number;
  linkedCount: number;
  activityScore: number;
  trendDelta: number;
};

export type NetworkDashboardData = {
  mode: DashboardNetworkMode;
  summary: {
    groupCount: number;
    memberCount: number;
    pendingCount: number;
    totalActivities: number;
    activeGroupCount: number;
    linkedCount: number;
  };
  timeline: Array<{
    date: string;
    label: string;
    prayer: number;
    faith: number;
    posts: number;
    linked: number;
    total: number;
  }>;
  groups: NetworkGroupCard[];
  highlights: {
    strongest: NetworkGroupCard | null;
    attention: NetworkGroupCard | null;
    pending: NetworkGroupCard | null;
  };
  limitedMessage: string | null;
};

export type DashboardActivityDetail = {
  kind: "audio" | "qt" | "reading" | "bookmark" | "faith" | "unknown";
  title: string;
  subtitle: string;
  reference: string | null;
  body: string | null;
  audioUrl: string | null;
  audioDuration: number;
  meta: Array<{ label: string; value: string }>;
};

type RawActivityRow = {
  id: number;
  activity_type: DashboardActivityType;
  source_kind: DashboardActivitySourceKind;
  source_group_id: string | null;
  source_table: string;
  source_row_id: string;
  payload: Record<string, any> | null;
  occurred_at: string;
};

type GroupStatRow = {
  group_id: string;
  member_count: number;
  pending_requests: number;
  prayer_records: number;
  faith_records: number;
  post_count: number;
  linked_activities: number;
  depth?: number;
  group_name?: string;
};

type GroupTimelineRow = {
  bucket_date: string;
  prayer_records: number;
  faith_records: number;
  post_count: number;
  linked_activities: number;
};

const ACTIVITY_LABELS: Record<DashboardActivityType, string> = {
  qt: "QT",
  prayer: "기도",
  reading: "성경읽기",
  bookmark: "말씀저장",
};

const ACTIVITY_COLORS: Record<DashboardActivityType, string> = {
  qt: "#48624E",
  prayer: "#C47D2C",
  reading: "#2F5B91",
  bookmark: "#8A4F33",
};

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
const TIME_BUCKETS = [
  { label: "새벽", start: 0, end: 5 },
  { label: "오전", start: 6, end: 9 },
  { label: "낮", start: 10, end: 13 },
  { label: "오후", start: 14, end: 17 },
  { label: "저녁", start: 18, end: 21 },
  { label: "밤", start: 22, end: 23 },
];

function startOfWindow(days: number) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start;
}

function toDateKey(dateLike: Date | string) {
  const date = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortDate(dateLike: Date | string) {
  const date = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(date);
}

function formatDateTime(dateLike: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateLike));
}

function buildDateBuckets(days: number) {
  const start = startOfWindow(days);
  return Array.from({ length: days }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return current;
  });
}

function computeStreak(activeDateKeys: Set<string>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;

  while (true) {
    const current = new Date(today);
    current.setDate(today.getDate() - streak);
    const key = toDateKey(current);
    if (!activeDateKeys.has(key)) break;
    streak += 1;
  }

  return streak;
}

function rolePriority(role: DashboardGroupRole) {
  if (role === "owner") return 3;
  if (role === "leader") return 2;
  return 1;
}

function toGroupRole(value: unknown): DashboardGroupRole {
  if (value === "owner" || value === "leader") return value;
  return "member";
}

function toNumericRowId(sourceRowId: string) {
  return /^\d+$/.test(sourceRowId) ? Number(sourceRowId) : sourceRowId;
}

function buildReadingReference(payload: Record<string, any> | null | undefined) {
  if (!payload) return null;
  const book = payload.book_name || "";
  const chapter = payload.chapter ? `${payload.chapter}장` : "";
  const verse =
    payload.start_verse && payload.end_verse
      ? `${payload.start_verse}-${payload.end_verse}절`
      : payload.verse
        ? `${payload.verse}절`
        : "";
  const joined = [book, chapter, verse].filter(Boolean).join(" ");
  return joined || null;
}

function buildQtReference(payload: Record<string, any> | null | undefined) {
  if (!payload) return null;
  const book = payload.book_name || "";
  const chapter = payload.chapter ? `${payload.chapter}장` : "";
  const verse = payload.verse ? `${payload.verse}절` : "";
  const joined = [book, chapter, verse].filter(Boolean).join(" ");
  return joined || null;
}

function describeActivity(row: RawActivityRow, linkedGroups: DashboardActivityLink[], sourceGroupName: string | null) {
  const payload = row.payload || {};

  if (row.activity_type === "qt") {
    const reference = buildQtReference(payload);
    return {
      title: reference ? `QT 묵상 · ${reference}` : "QT 묵상",
      summary:
        payload.meditation_excerpt ||
        (payload.meditation_type === "audio" ? "음성 묵상을 남겼습니다." : "묵상 기록을 남겼습니다."),
      reference,
      audioUrl: typeof payload.audio_url === "string" ? payload.audio_url : null,
      audioDuration: Number(payload.audio_duration || 0),
    };
  }

  if (row.activity_type === "prayer") {
    const linkedLabel =
      sourceGroupName ||
      (linkedGroups.length === 1 ? linkedGroups[0].name : linkedGroups.length > 1 ? `${linkedGroups.length}개 모임 연결` : null);
    return {
      title: payload.title || (row.source_kind === "group_direct" ? "모임 음성기도" : "음성 기도"),
      summary:
        row.source_kind === "group_direct"
          ? `${sourceGroupName || "선택한 모임"}에 직접 남긴 음성기도`
          : linkedLabel
            ? `${linkedLabel}에 연결된 개인 기도 기록`
            : "개인 기도 기록을 남겼습니다.",
      reference: linkedLabel,
      audioUrl: typeof payload.audio_url === "string" ? payload.audio_url : null,
      audioDuration: Number(payload.audio_duration || 0),
    };
  }

  if (row.activity_type === "reading") {
    const reference = buildReadingReference(payload);
    return {
      title: reference || "성경 읽기",
      summary:
        Number(payload.read_count || 1) > 1
          ? `${Number(payload.read_count || 1)}회 읽기 완료`
          : "읽기 완료를 기록했습니다.",
      reference,
      audioUrl: null,
      audioDuration: 0,
    };
  }

  return {
    title: payload.verse_ref || "말씀 저장",
    summary: payload.content || "말씀을 저장했습니다.",
    reference: payload.verse_ref || null,
    audioUrl: null,
    audioDuration: 0,
  };
}

function buildDailyMap(days: number) {
  const map = new Map<string, DashboardDailyPoint>();

  buildDateBuckets(days).forEach((date) => {
    const key = toDateKey(date);
    map.set(key, {
      date: key,
      label: formatShortDate(date),
      qt: 0,
      prayer: 0,
      reading: 0,
      bookmark: 0,
      total: 0,
    });
  });

  return map;
}

function buildHeatmapCells(daily: DashboardDailyPoint[]): DashboardHeatmapCell[] {
  const maxTotal = daily.reduce((max, item) => Math.max(max, item.total), 0);

  return daily.map((item) => {
    if (item.total <= 0 || maxTotal <= 0) {
      return { date: item.date, label: item.label, total: item.total, level: 0 };
    }

    const ratio = item.total / maxTotal;
    const level = ratio >= 0.85 ? 4 : ratio >= 0.6 ? 3 : ratio >= 0.35 ? 2 : 1;
    return { date: item.date, label: item.label, total: item.total, level: level as 1 | 2 | 3 | 4 };
  });
}

function findLabelForExtreme(mix: DashboardMixItem[], mode: "max" | "min") {
  const sorted = [...mix].sort((a, b) => {
    if (mode === "max") return b.value - a.value;
    return a.value - b.value;
  });
  const candidate = sorted.find((item) => item.value > 0) || sorted[0];
  return candidate ? candidate.label : "기록 없음";
}

function createPatternPoints(labels: string[]) {
  return labels.map((label) => ({ label, total: 0 }));
}

function addActivityToDaily(map: Map<string, DashboardDailyPoint>, row: DashboardActivityItem) {
  const key = toDateKey(row.occurredAt);
  const point = map.get(key);
  if (!point) return;
  point[row.type] += 1;
  point.total += 1;
}

async function fetchGroupNames(groupIds: string[]) {
  if (groupIds.length === 0) return new Map<string, string>();

  const { data, error } = await supabase.from("groups").select("id, name").in("id", groupIds);
  if (error) throw error;

  const map = new Map<string, string>();
  (data ?? []).forEach((row: any) => {
    if (row?.id && row?.name) {
      map.set(String(row.id), String(row.name));
    }
  });
  return map;
}

function normalizeActivityRows(rawRows: RawActivityRow[], linkMap: Map<string, DashboardActivityLink[]>, sourceGroupMap: Map<string, string>) {
  return rawRows.map((row) => {
    const links = linkMap.get(String(row.id)) ?? [];
    const sourceGroupName = row.source_group_id ? sourceGroupMap.get(row.source_group_id) || null : null;
    const descriptor = describeActivity(row, links, sourceGroupName);

    return {
      id: String(row.id),
      type: row.activity_type,
      occurredAt: row.occurred_at,
      sourceKind: row.source_kind,
      sourceTable: row.source_table,
      sourceRowId: row.source_row_id,
      sourceGroupId: row.source_group_id,
      sourceGroupName,
      title: descriptor.title,
      summary: descriptor.summary,
      reference: descriptor.reference,
      audioUrl: descriptor.audioUrl,
      audioDuration: descriptor.audioDuration,
      linkedGroups: links,
    } satisfies DashboardActivityItem;
  });
}

async function loadUserActivityItems(userId: string, days: TimeframeDays) {
  const sinceIso = startOfWindow(days).toISOString();

  const { data, error } = await supabase
    .from("activity_logs")
    .select("id, activity_type, source_kind, source_group_id, source_table, source_row_id, payload, occurred_at")
    .eq("user_id", userId)
    .gte("occurred_at", sinceIso)
    .order("occurred_at", { ascending: false })
    .limit(800);

  if (error) throw error;

  const rawRows = (data ?? []) as RawActivityRow[];
  const activityIds = rawRows.map((row) => row.id);

  const { data: linkRows, error: linkError } = activityIds.length
    ? await supabase
        .from("activity_group_links")
        .select("activity_log_id, group_id")
        .in("activity_log_id", activityIds)
    : { data: [], error: null };

  if (linkError) throw linkError;

  const groupIds = new Set<string>();
  rawRows.forEach((row) => {
    if (row.source_group_id) groupIds.add(row.source_group_id);
  });
  (linkRows ?? []).forEach((row: any) => {
    if (row?.group_id) groupIds.add(String(row.group_id));
  });

  const groupNameMap = await fetchGroupNames(Array.from(groupIds));

  const linkMap = new Map<string, DashboardActivityLink[]>();
  (linkRows ?? []).forEach((row: any) => {
    const activityId = String(row.activity_log_id);
    const current = linkMap.get(activityId) ?? [];
    const groupId = String(row.group_id);
    const groupName = groupNameMap.get(groupId);
    if (groupName) {
      current.push({ id: groupId, name: groupName });
      current.sort((a, b) => a.name.localeCompare(b.name, "ko"));
      linkMap.set(activityId, current);
    }
  });

  return normalizeActivityRows(rawRows, linkMap, groupNameMap);
}

async function fetchManagedNetworkData(groupIds: string[], days: TimeframeDays): Promise<NetworkDashboardData> {
  if (groupIds.length === 0) {
    return {
      mode: "managed",
      summary: {
        groupCount: 0,
        memberCount: 0,
        pendingCount: 0,
        totalActivities: 0,
        activeGroupCount: 0,
        linkedCount: 0,
      },
      timeline: [],
      groups: [],
      highlights: { strongest: null, attention: null, pending: null },
      limitedMessage: null,
    };
  }

  const since = startOfWindow(days);
  const sinceIso = since.toISOString();
  const sinceDate = toDateKey(since);

  const [
    groupNames,
    memberRowsResult,
    pendingRowsResult,
    prayerRowsResult,
    faithRowsResult,
    postRowsResult,
    linkRowsResult,
  ] = await Promise.all([
    fetchGroupNames(groupIds),
    supabase.from("group_members").select("group_id, user_id").in("group_id", groupIds),
    supabase.from("group_join_requests").select("group_id, status").in("group_id", groupIds).eq("status", "pending"),
    supabase.from("group_prayer_records").select("group_id, created_at").in("group_id", groupIds).gte("created_at", sinceIso),
    supabase.from("group_faith_records").select("group_id, record_date").in("group_id", groupIds).gte("record_date", sinceDate),
    supabase.from("group_posts").select("group_id, created_at").in("group_id", groupIds).gte("created_at", sinceIso),
    supabase.from("activity_group_links").select("group_id, linked_at").in("group_id", groupIds).gte("linked_at", sinceIso),
  ]);

  if (memberRowsResult.error) throw memberRowsResult.error;
  if (pendingRowsResult.error) throw pendingRowsResult.error;
  if (prayerRowsResult.error) throw prayerRowsResult.error;
  if (faithRowsResult.error) throw faithRowsResult.error;
  if (postRowsResult.error) throw postRowsResult.error;
  if (linkRowsResult.error) throw linkRowsResult.error;

  const statsMap = new Map<string, NetworkGroupCard>();
  groupIds.forEach((groupId) => {
    statsMap.set(groupId, {
      id: groupId,
      name: groupNames.get(groupId) || "이름 없는 모임",
      depth: 0,
      memberCount: 0,
      pendingCount: 0,
      prayerCount: 0,
      faithCount: 0,
      postCount: 0,
      linkedCount: 0,
      activityScore: 0,
      trendDelta: 0,
    });
  });

  (memberRowsResult.data ?? []).forEach((row: any) => {
    const group = statsMap.get(String(row.group_id));
    if (group) group.memberCount += 1;
  });

  (pendingRowsResult.data ?? []).forEach((row: any) => {
    const group = statsMap.get(String(row.group_id));
    if (group) group.pendingCount += 1;
  });

  const timelineMap = new Map<string, { prayer: number; faith: number; posts: number; linked: number }>();
  buildDateBuckets(days).forEach((date) => {
    timelineMap.set(toDateKey(date), { prayer: 0, faith: 0, posts: 0, linked: 0 });
  });

  const groupDailyMap = new Map<string, Map<string, number>>();
  groupIds.forEach((groupId) => groupDailyMap.set(groupId, new Map()));

  const bumpGroupDaily = (groupId: string, dateKey: string) => {
    const map = groupDailyMap.get(groupId);
    if (!map) return;
    map.set(dateKey, (map.get(dateKey) ?? 0) + 1);
  };

  (prayerRowsResult.data ?? []).forEach((row: any) => {
    const groupId = String(row.group_id);
    const group = statsMap.get(groupId);
    if (!group) return;
    group.prayerCount += 1;
    const dateKey = toDateKey(row.created_at);
    timelineMap.get(dateKey)!.prayer += 1;
    bumpGroupDaily(groupId, dateKey);
  });

  (faithRowsResult.data ?? []).forEach((row: any) => {
    const groupId = String(row.group_id);
    const group = statsMap.get(groupId);
    if (!group) return;
    group.faithCount += 1;
    const dateKey = String(row.record_date);
    if (timelineMap.has(dateKey)) {
      timelineMap.get(dateKey)!.faith += 1;
      bumpGroupDaily(groupId, dateKey);
    }
  });

  (postRowsResult.data ?? []).forEach((row: any) => {
    const groupId = String(row.group_id);
    const group = statsMap.get(groupId);
    if (!group) return;
    group.postCount += 1;
    const dateKey = toDateKey(row.created_at);
    timelineMap.get(dateKey)!.posts += 1;
    bumpGroupDaily(groupId, dateKey);
  });

  (linkRowsResult.data ?? []).forEach((row: any) => {
    const groupId = String(row.group_id);
    const group = statsMap.get(groupId);
    if (!group) return;
    group.linkedCount += 1;
    const dateKey = toDateKey(row.linked_at);
    timelineMap.get(dateKey)!.linked += 1;
    bumpGroupDaily(groupId, dateKey);
  });

  const compareWindow = Math.min(7, Math.max(1, Math.floor(days / 2)));
  const currentStart = new Date();
  currentStart.setHours(0, 0, 0, 0);
  currentStart.setDate(currentStart.getDate() - (compareWindow - 1));
  const previousStart = new Date(currentStart);
  previousStart.setDate(currentStart.getDate() - compareWindow);

  statsMap.forEach((group) => {
    group.activityScore = group.prayerCount + group.faithCount + group.postCount + group.linkedCount;

    let currentWindowCount = 0;
    let previousWindowCount = 0;
    const dailyMap = groupDailyMap.get(group.id) ?? new Map();

    dailyMap.forEach((value, dateKey) => {
      const date = new Date(dateKey);
      if (date >= currentStart) {
        currentWindowCount += value;
      } else if (date >= previousStart && date < currentStart) {
        previousWindowCount += value;
      }
    });

    group.trendDelta = currentWindowCount - previousWindowCount;
  });

  const groups = Array.from(statsMap.values()).sort((a, b) => {
    if (b.activityScore !== a.activityScore) return b.activityScore - a.activityScore;
    return a.name.localeCompare(b.name, "ko");
  });

  const timeline = Array.from(timelineMap.entries()).map(([date, bucket]) => ({
    date,
    label: formatShortDate(date),
    prayer: bucket.prayer,
    faith: bucket.faith,
    posts: bucket.posts,
    linked: bucket.linked,
    total: bucket.prayer + bucket.faith + bucket.posts + bucket.linked,
  }));

  return {
    mode: "managed",
    summary: {
      groupCount: groups.length,
      memberCount: groups.reduce((sum, group) => sum + group.memberCount, 0),
      pendingCount: groups.reduce((sum, group) => sum + group.pendingCount, 0),
      totalActivities: groups.reduce((sum, group) => sum + group.activityScore, 0),
      activeGroupCount: groups.filter((group) => group.activityScore > 0).length,
      linkedCount: groups.reduce((sum, group) => sum + group.linkedCount, 0),
    },
    timeline,
    groups,
    highlights: {
      strongest: groups[0] ?? null,
      attention: [...groups]
        .filter((group) => group.trendDelta < 0)
        .sort((a, b) => a.trendDelta - b.trendDelta)[0] ?? null,
      pending: [...groups].sort((a, b) => b.pendingCount - a.pendingCount)[0] ?? null,
    },
    limitedMessage: null,
  };
}

async function fetchScopeNetworkData(days: TimeframeDays): Promise<NetworkDashboardData> {
  try {
    const [{ data: kpiRows, error: kpiError }, { data: timelineRows, error: timelineError }] = await Promise.all([
      supabase.rpc("get_dashboard_group_kpis", { p_days: days, p_scope: "scope" }),
      supabase.rpc("get_dashboard_group_timeline", { p_days: days, p_scope: "scope" }),
    ]);

    if (kpiError) throw kpiError;
    if (timelineError) throw timelineError;

    const groups = ((kpiRows ?? []) as GroupStatRow[]).map((row) => ({
      id: String(row.group_id),
      name: row.group_name || "이름 없는 모임",
      depth: Number(row.depth || 0),
      memberCount: Number(row.member_count || 0),
      pendingCount: Number(row.pending_requests || 0),
      prayerCount: Number(row.prayer_records || 0),
      faithCount: Number(row.faith_records || 0),
      postCount: Number(row.post_count || 0),
      linkedCount: Number(row.linked_activities || 0),
      activityScore:
        Number(row.prayer_records || 0) +
        Number(row.faith_records || 0) +
        Number(row.post_count || 0) +
        Number(row.linked_activities || 0),
      trendDelta: 0,
    }));

    const timeline = ((timelineRows ?? []) as GroupTimelineRow[]).map((row) => ({
      date: row.bucket_date,
      label: formatShortDate(row.bucket_date),
      prayer: Number(row.prayer_records || 0),
      faith: Number(row.faith_records || 0),
      posts: Number(row.post_count || 0),
      linked: Number(row.linked_activities || 0),
      total:
        Number(row.prayer_records || 0) +
        Number(row.faith_records || 0) +
        Number(row.post_count || 0) +
        Number(row.linked_activities || 0),
    }));

    return {
      mode: "scope",
      summary: {
        groupCount: groups.length,
        memberCount: groups.reduce((sum, group) => sum + group.memberCount, 0),
        pendingCount: groups.reduce((sum, group) => sum + group.pendingCount, 0),
        totalActivities: groups.reduce((sum, group) => sum + group.activityScore, 0),
        activeGroupCount: groups.filter((group) => group.activityScore > 0).length,
        linkedCount: groups.reduce((sum, group) => sum + group.linkedCount, 0),
      },
      timeline,
      groups,
      highlights: {
        strongest: groups[0] ?? null,
        attention: [...groups].sort((a, b) => a.activityScore - b.activityScore)[0] ?? null,
        pending: [...groups].sort((a, b) => b.pendingCount - a.pendingCount)[0] ?? null,
      },
      limitedMessage: null,
    };
  } catch (error) {
    console.warn("scope network dashboard fallback:", error);
    return {
      mode: "scope",
      summary: {
        groupCount: 0,
        memberCount: 0,
        pendingCount: 0,
        totalActivities: 0,
        activeGroupCount: 0,
        linkedCount: 0,
      },
      timeline: [],
      groups: [],
      highlights: {
        strongest: null,
        attention: null,
        pending: null,
      },
      limitedMessage: "상위리더 범위 비교 지표는 대시보드 RPC 마이그레이션 적용 후 전체 표시됩니다.",
    };
  }
}

export async function fetchDashboardContexts(userId: string): Promise<DashboardContexts> {
  const [{ data: ownerGroups, error: ownerError }, { data: memberRows, error: memberError }, { data: scopeRootRows, error: scopeRootError }] =
    await Promise.all([
      supabase.from("groups").select("id, name").eq("owner_id", userId),
      supabase.from("group_members").select("group_id, role").eq("user_id", userId),
      supabase.from("group_scope_leaders").select("root_group_id, can_manage").eq("user_id", userId),
    ]);

  if (ownerError) throw ownerError;
  if (memberError) throw memberError;
  if (scopeRootError) throw scopeRootError;

  const ownerGroupIds = (ownerGroups ?? []).map((row: any) => String(row.id));
  const memberGroupIds = (memberRows ?? []).map((row: any) => String(row.group_id));
  const scopeRootIds = (scopeRootRows ?? []).map((row: any) => String(row.root_group_id));

  const scopeGroupsResult =
    scopeRootIds.length > 0
      ? await supabase.rpc("get_scope_groups", { p_user_id: userId })
      : { data: [], error: null };

  if (scopeGroupsResult.error) throw scopeGroupsResult.error;

  const scopeGroupsData = (scopeGroupsResult.data ?? []) as Array<{ group_id: string; depth: number }>;
  const allGroupIds = Array.from(new Set([...ownerGroupIds, ...memberGroupIds, ...scopeRootIds, ...scopeGroupsData.map((row) => String(row.group_id))]));
  const groupNameMap = await fetchGroupNames(allGroupIds);

  const groupMap = new Map<string, DashboardGroupContext>();

  (memberRows ?? []).forEach((row: any) => {
    const groupId = String(row.group_id);
    const existing = groupMap.get(groupId);
    const nextRole = toGroupRole(row.role);
    const name = groupNameMap.get(groupId) || "이름 없는 모임";

    if (!existing || rolePriority(nextRole) > rolePriority(existing.role)) {
      groupMap.set(groupId, {
        id: groupId,
        name,
        role: nextRole,
        isScopeRoot: false,
        isScopeGroup: false,
        scopeDepth: null,
      });
    }
  });

  (ownerGroups ?? []).forEach((row: any) => {
    const groupId = String(row.id);
    groupMap.set(groupId, {
      id: groupId,
      name: String(row.name),
      role: "owner",
      isScopeRoot: false,
      isScopeGroup: false,
      scopeDepth: null,
    });
  });

  const scopeInfoMap = new Map<string, number>();
  scopeGroupsData.forEach((row) => {
    scopeInfoMap.set(String(row.group_id), Number(row.depth || 0));
  });

  scopeInfoMap.forEach((depth, groupId) => {
    const existing = groupMap.get(groupId);
    if (existing) {
      groupMap.set(groupId, {
        ...existing,
        isScopeGroup: true,
        isScopeRoot: scopeRootIds.includes(groupId),
        scopeDepth: depth,
      });
    }
  });

  const groups = Array.from(groupMap.values()).sort((a, b) => {
    if (rolePriority(b.role) !== rolePriority(a.role)) {
      return rolePriority(b.role) - rolePriority(a.role);
    }
    return a.name.localeCompare(b.name, "ko");
  });

  const managedGroups = groups.filter((group) => group.role === "owner" || group.role === "leader");
  const scopeGroups = Array.from(scopeInfoMap.entries())
    .map(([groupId, depth]) => ({
      id: groupId,
      name: groupNameMap.get(groupId) || "이름 없는 모임",
      scopeDepth: depth,
    }))
    .sort((a, b) => a.scopeDepth - b.scopeDepth || a.name.localeCompare(b.name, "ko"));

  const scopeRoots = (scopeRootRows ?? [])
    .map((row: any) => ({
      id: String(row.root_group_id),
      name: groupNameMap.get(String(row.root_group_id)) || "이름 없는 모임",
      canManage: Boolean(row.can_manage),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  return {
    groups,
    managedGroups,
    scopeGroups,
    scopeRoots,
    summary: {
      joinedGroupCount: groups.length,
      managedGroupCount: managedGroups.length,
      scopeGroupCount: scopeGroups.length,
      scopeRootCount: scopeRoots.length,
      hasNetworkAccess: managedGroups.length > 0 || scopeGroups.length > 0,
      hasScopeAccess: scopeGroups.length > 0,
    },
  };
}

export async function fetchPersonalDashboardData(userId: string, days: TimeframeDays): Promise<PersonalDashboardData> {
  const activities = await loadUserActivityItems(userId, days);
  const dailyMap = buildDailyMap(days);

  activities.forEach((activity) => addActivityToDaily(dailyMap, activity));

  const daily = Array.from(dailyMap.values());
  const activeDateKeys = new Set(daily.filter((point) => point.total > 0).map((point) => point.date));
  const mix: DashboardMixItem[] = (["qt", "prayer", "reading", "bookmark"] as DashboardActivityType[]).map((key) => ({
    key,
    label: ACTIVITY_LABELS[key],
    value: daily.reduce((sum, point) => sum + point[key], 0),
    color: ACTIVITY_COLORS[key],
  }));

  const weekdayPattern = createPatternPoints(WEEKDAY_LABELS);
  const timePattern = createPatternPoints(TIME_BUCKETS.map((bucket) => bucket.label));
  const linkedGroupCountMap = new Map<string, { id: string; name: string; count: number }>();

  activities.forEach((activity) => {
    const date = new Date(activity.occurredAt);
    const weekdayIndex = (date.getDay() + 6) % 7;
    weekdayPattern[weekdayIndex].total += 1;

    const hour = date.getHours();
    const bucketIndex = TIME_BUCKETS.findIndex((bucket) => hour >= bucket.start && hour <= bucket.end);
    if (bucketIndex >= 0) {
      timePattern[bucketIndex].total += 1;
    }

    if (activity.sourceGroupId && activity.sourceGroupName) {
      const current = linkedGroupCountMap.get(activity.sourceGroupId) ?? {
        id: activity.sourceGroupId,
        name: activity.sourceGroupName,
        count: 0,
      };
      current.count += 1;
      linkedGroupCountMap.set(activity.sourceGroupId, current);
    }

    activity.linkedGroups.forEach((group) => {
      const current = linkedGroupCountMap.get(group.id) ?? { ...group, count: 0 };
      current.count += 1;
      linkedGroupCountMap.set(group.id, current);
    });
  });

  const linkedCount = activities.filter((activity) => activity.linkedGroups.length > 0).length;
  const groupDirectCount = activities.filter((activity) => activity.sourceKind === "group_direct").length;

  return {
    totals: {
      total: activities.length,
      activeDays: activeDateKeys.size,
      streak: computeStreak(activeDateKeys),
      linkedCount,
      groupDirectCount,
      groupTiedRate: activities.length > 0 ? Math.round(((linkedCount + groupDirectCount) / activities.length) * 100) : 0,
    },
    daily,
    heatmap: buildHeatmapCells(daily),
    mix,
    weekdayPattern,
    timePattern,
    linkedGroups: Array.from(linkedGroupCountMap.values())
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko"))
      .slice(0, 6),
    recent: activities.slice(0, 14),
    highlights: {
      strongestLabel: findLabelForExtreme(mix, "max"),
      weakestLabel: findLabelForExtreme(mix, "min"),
      bestWeekdayLabel: [...weekdayPattern].sort((a, b) => b.total - a.total)[0]?.label || "기록 없음",
      bestTimeLabel: [...timePattern].sort((a, b) => b.total - a.total)[0]?.label || "기록 없음",
    },
  };
}

export async function fetchGroupDashboardData(
  userId: string,
  group: DashboardGroupContext,
  days: TimeframeDays,
): Promise<GroupDashboardData> {
  const since = startOfWindow(days);
  const sinceIso = since.toISOString();
  const sinceDate = toDateKey(since);
  const canManage = group.role === "owner" || group.role === "leader";

  const [
    directLogsResult,
    groupPrayerRowsResult,
    groupFaithRowsResult,
    groupPostRowsResult,
    groupLinkRowsResult,
  ] = await Promise.all([
    supabase
      .from("activity_logs")
      .select("id, activity_type, source_kind, source_group_id, source_table, source_row_id, payload, occurred_at")
      .eq("user_id", userId)
      .eq("source_kind", "group_direct")
      .eq("source_group_id", group.id)
      .gte("occurred_at", sinceIso)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("group_prayer_records")
      .select("user_id, created_at")
      .eq("group_id", group.id)
      .gte("created_at", sinceIso),
    supabase
      .from("group_faith_records")
      .select("user_id, record_date")
      .eq("group_id", group.id)
      .gte("record_date", sinceDate),
    supabase
      .from("group_posts")
      .select("author_id, created_at")
      .eq("group_id", group.id)
      .gte("created_at", sinceIso),
    supabase
      .from("activity_group_links")
      .select("activity_log_id, linked_by, linked_at")
      .eq("group_id", group.id)
      .gte("linked_at", sinceIso),
  ]);

  if (directLogsResult.error) throw directLogsResult.error;
  if (groupPrayerRowsResult.error) throw groupPrayerRowsResult.error;
  if (groupFaithRowsResult.error) throw groupFaithRowsResult.error;
  if (groupPostRowsResult.error) throw groupPostRowsResult.error;
  if (groupLinkRowsResult.error) throw groupLinkRowsResult.error;

  const groupLinkRows = groupLinkRowsResult.data ?? [];
  const linkedActivityIds = Array.from(new Set(groupLinkRows.map((row: any) => Number(row.activity_log_id))));
  const linkedLogsResult =
    linkedActivityIds.length > 0
      ? await supabase
          .from("activity_logs")
          .select("id, activity_type, source_kind, source_group_id, source_table, source_row_id, payload, occurred_at")
          .in("id", linkedActivityIds)
          .eq("user_id", userId)
          .gte("occurred_at", sinceIso)
          .order("occurred_at", { ascending: false })
      : { data: [], error: null };

  if (linkedLogsResult.error) throw linkedLogsResult.error;

  const directLogs = normalizeActivityRows((directLogsResult.data ?? []) as RawActivityRow[], new Map(), new Map([[group.id, group.name]]));
  const linkedLogs = normalizeActivityRows(
    (linkedLogsResult.data ?? []) as RawActivityRow[],
    new Map((linkedLogsResult.data ?? []).map((row: any) => [String(row.id), [{ id: group.id, name: group.name }]])),
    new Map(),
  );

  const myActivities = [...linkedLogs, ...directLogs]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 24);

  const myDailyMap = buildDailyMap(days);
  myActivities.forEach((activity) => addActivityToDaily(myDailyMap, activity));

  const groupTotalsMap = buildDateBuckets(days).reduce(
    (map, date) => {
      map.set(toDateKey(date), { prayer: 0, faith: 0, posts: 0, linked: 0 });
      return map;
    },
    new Map<string, { prayer: number; faith: number; posts: number; linked: number }>(),
  );

  (groupPrayerRowsResult.data ?? []).forEach((row: any) => {
    const dateKey = toDateKey(row.created_at);
    if (groupTotalsMap.has(dateKey)) groupTotalsMap.get(dateKey)!.prayer += 1;
  });
  (groupFaithRowsResult.data ?? []).forEach((row: any) => {
    const dateKey = String(row.record_date);
    if (groupTotalsMap.has(dateKey)) groupTotalsMap.get(dateKey)!.faith += 1;
  });
  (groupPostRowsResult.data ?? []).forEach((row: any) => {
    const dateKey = toDateKey(row.created_at);
    if (groupTotalsMap.has(dateKey)) groupTotalsMap.get(dateKey)!.posts += 1;
  });
  groupLinkRows.forEach((row: any) => {
    const dateKey = toDateKey(row.linked_at);
    if (groupTotalsMap.has(dateKey)) groupTotalsMap.get(dateKey)!.linked += 1;
  });

  const myDaily = Array.from(myDailyMap.values());
  const mix: DashboardMixItem[] = (["qt", "prayer", "reading", "bookmark"] as DashboardActivityType[]).map((key) => ({
    key,
    label: ACTIVITY_LABELS[key],
    value: myDaily.reduce((sum, point) => sum + point[key], 0),
    color: ACTIVITY_COLORS[key],
  }));

  const activeDateKeys = new Set(myDaily.filter((point) => point.total > 0).map((point) => point.date));
  const daily = myDaily.map((point) => {
    const totals = groupTotalsMap.get(point.date)!;
    return {
      ...point,
      groupTotal: totals.prayer + totals.faith + totals.posts + totals.linked,
      linkedTotal: totals.linked,
      directTotal: totals.prayer + totals.faith + totals.posts,
    };
  });

  let leaderboard: GroupMemberMomentum[] = [];
  let inactiveMembers: GroupMemberMomentum[] = [];
  let pendingRequests: PendingJoinRequest[] = [];
  let memberCount: number | null = null;
  let pendingCount = 0;

  if (canManage) {
    const [memberRowsResult, pendingRowsResult] = await Promise.all([
      supabase.from("group_members").select("user_id, role").eq("group_id", group.id),
      supabase
        .from("group_join_requests")
        .select("id, user_id, created_at")
        .eq("group_id", group.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    if (memberRowsResult.error) throw memberRowsResult.error;
    if (pendingRowsResult.error) throw pendingRowsResult.error;

    const memberRows = memberRowsResult.data ?? [];
    memberCount = memberRows.length;
    pendingCount = (pendingRowsResult.data ?? []).length;

    const memberIds = Array.from(new Set(memberRows.map((row: any) => String(row.user_id))));
    const pendingIds = Array.from(new Set((pendingRowsResult.data ?? []).map((row: any) => String(row.user_id))));
    const profileIds = Array.from(new Set([...memberIds, ...pendingIds]));
    const profilesResult =
      profileIds.length > 0
        ? await supabase.from("profiles").select("id, nickname, username, avatar_url").in("id", profileIds)
        : { data: [], error: null };

    if (profilesResult.error) throw profilesResult.error;

    const profileMap = new Map<string, { name: string; avatarUrl: string | null }>();
    (profilesResult.data ?? []).forEach((row: any) => {
      profileMap.set(String(row.id), {
        name: String(row.nickname || row.username || "모임원"),
        avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
      });
    });

    const memberScoreMap = new Map<string, GroupMemberMomentum>();

    memberRows.forEach((row: any) => {
      const userId = String(row.user_id);
      const profile = profileMap.get(userId);
      memberScoreMap.set(userId, {
        userId,
        name: profile?.name || "모임원",
        avatarUrl: profile?.avatarUrl || null,
        role: toGroupRole(row.role),
        total: 0,
        linked: 0,
        prayer: 0,
        faith: 0,
        posts: 0,
      });
    });

    (groupPrayerRowsResult.data ?? []).forEach((row: any) => {
      const entry = memberScoreMap.get(String(row.user_id));
      if (!entry) return;
      entry.prayer += 1;
      entry.total += 1;
    });
    (groupFaithRowsResult.data ?? []).forEach((row: any) => {
      const entry = memberScoreMap.get(String(row.user_id));
      if (!entry) return;
      entry.faith += 1;
      entry.total += 1;
    });
    (groupPostRowsResult.data ?? []).forEach((row: any) => {
      const entry = memberScoreMap.get(String(row.author_id));
      if (!entry) return;
      entry.posts += 1;
      entry.total += 1;
    });
    groupLinkRows.forEach((row: any) => {
      const entry = memberScoreMap.get(String(row.linked_by));
      if (!entry) return;
      entry.linked += 1;
      entry.total += 1;
    });

    const members = Array.from(memberScoreMap.values()).sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.name.localeCompare(b.name, "ko");
    });

    leaderboard = members.slice(0, 6);
    inactiveMembers = members.filter((member) => member.total === 0).slice(0, 6);
    pendingRequests = (pendingRowsResult.data ?? []).map((row: any) => ({
      id: String(row.id),
      name: profileMap.get(String(row.user_id))?.name || "가입 대기자",
      createdAt: String(row.created_at),
    }));
  }

  const groupTotal = daily.reduce((sum, point) => sum + point.groupTotal, 0);
  const myTotal = daily.reduce((sum, point) => sum + point.total, 0);

  return {
    group,
    canManage,
    summary: {
      myTotal,
      groupTotal,
      linkedCount: linkedLogs.length,
      directCount: directLogs.length,
      shareRate: groupTotal > 0 ? Math.round((myTotal / groupTotal) * 100) : 0,
      activeDays: activeDateKeys.size,
      streak: computeStreak(activeDateKeys),
      activeContributorCount: canManage ? leaderboard.filter((member) => member.total > 0).length : new Set([
        ...(groupPrayerRowsResult.data ?? []).map((row: any) => String(row.user_id)),
        ...(groupFaithRowsResult.data ?? []).map((row: any) => String(row.user_id)),
        ...(groupPostRowsResult.data ?? []).map((row: any) => String(row.author_id)),
        ...groupLinkRows.map((row: any) => String(row.linked_by)),
      ]).size,
      memberCount,
      pendingCount,
    },
    daily,
    mix,
    recent: myActivities,
    leaderboard,
    inactiveMembers,
    pendingRequests,
  };
}

export async function fetchNetworkDashboardData(options: {
  mode: DashboardNetworkMode;
  managedGroupIds: string[];
  scopeGroupIds: string[];
  days: TimeframeDays;
}): Promise<NetworkDashboardData> {
  const { mode, managedGroupIds, scopeGroupIds, days } = options;
  if (mode === "scope") {
    return fetchScopeNetworkData(days);
  }
  return fetchManagedNetworkData(managedGroupIds, days);
}

export async function fetchDashboardActivityDetail(activity: DashboardActivityItem): Promise<DashboardActivityDetail> {
  const fallback: DashboardActivityDetail = {
    kind: activity.audioUrl ? "audio" : activity.type === "reading" ? "reading" : activity.type === "bookmark" ? "bookmark" : activity.type === "qt" ? "qt" : "unknown",
    title: activity.title,
    subtitle: formatDateTime(activity.occurredAt),
    reference: activity.reference,
    body: activity.summary,
    audioUrl: activity.audioUrl,
    audioDuration: activity.audioDuration,
    meta: [],
  };

  const rowId = toNumericRowId(activity.sourceRowId);

  try {
    if (activity.sourceTable === "prayer_records") {
      const { data, error } = await supabase
        .from("prayer_records")
        .select("title, audio_url, audio_duration, date, created_at")
        .eq("id", rowId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return fallback;

      return {
        kind: "audio",
        title: data.title || "음성 기도",
        subtitle: formatDateTime(data.created_at || activity.occurredAt),
        reference: typeof data.date === "string" ? data.date : activity.reference,
        body: null,
        audioUrl: data.audio_url || activity.audioUrl,
        audioDuration: Number(data.audio_duration || activity.audioDuration || 0),
        meta: [{ label: "기록일", value: String(data.date || "") }].filter((item) => item.value),
      };
    }

    if (activity.sourceTable === "group_prayer_records") {
      const { data, error } = await supabase
        .from("group_prayer_records")
        .select("title, audio_url, audio_duration, created_at")
        .eq("id", rowId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return fallback;

      return {
        kind: "audio",
        title: data.title || "모임 음성기도",
        subtitle: formatDateTime(data.created_at || activity.occurredAt),
        reference: activity.sourceGroupName,
        body: null,
        audioUrl: data.audio_url || activity.audioUrl,
        audioDuration: Number(data.audio_duration || activity.audioDuration || 0),
        meta: activity.sourceGroupName ? [{ label: "모임", value: activity.sourceGroupName }] : [],
      };
    }

    if (activity.sourceTable === "user_meditation_records") {
      const { data, error } = await supabase
        .from("user_meditation_records")
        .select("date, book_name, chapter, verse, meditation_text, meditation_type, audio_url, audio_duration, created_at, updated_at")
        .eq("id", rowId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return fallback;

      const reference = [data.book_name, data.chapter ? `${data.chapter}장` : "", data.verse ? `${data.verse}절` : ""]
        .filter(Boolean)
        .join(" ");

      return {
        kind: "qt",
        title: reference ? `QT 묵상 · ${reference}` : "QT 묵상",
        subtitle: formatDateTime(data.updated_at || data.created_at || activity.occurredAt),
        reference: reference || null,
        body: data.meditation_text || null,
        audioUrl: data.audio_url || null,
        audioDuration: Number(data.audio_duration || 0),
        meta: [
          { label: "작성 유형", value: data.meditation_type === "audio" ? "음성 묵상" : "텍스트 묵상" },
          { label: "기록일", value: String(data.date || "") },
        ].filter((item) => item.value),
      };
    }

    if (activity.sourceTable === "qt_posts") {
      const { data, error } = await supabase
        .from("qt_posts")
        .select("target_date, meditation_content, prayer_content, created_at")
        .eq("id", rowId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return fallback;

      return {
        kind: "qt",
        title: "QT 묵상",
        subtitle: formatDateTime(data.created_at || activity.occurredAt),
        reference: typeof data.target_date === "string" ? data.target_date : null,
        body: data.meditation_content || data.prayer_content || null,
        audioUrl: null,
        audioDuration: 0,
        meta: [{ label: "대상일", value: String(data.target_date || "") }].filter((item) => item.value),
      };
    }

    if (activity.sourceTable === "user_reading_records") {
      const { data, error } = await supabase
        .from("user_reading_records")
        .select("date, book_name, chapter, start_verse, end_verse, read_count, created_at, updated_at")
        .eq("id", rowId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return fallback;

      const reference = [data.book_name, data.chapter ? `${data.chapter}장` : "", data.start_verse && data.end_verse ? `${data.start_verse}-${data.end_verse}절` : ""]
        .filter(Boolean)
        .join(" ");

      return {
        kind: "reading",
        title: reference || "성경 읽기",
        subtitle: formatDateTime(data.updated_at || data.created_at || activity.occurredAt),
        reference: reference || null,
        body: null,
        audioUrl: null,
        audioDuration: 0,
        meta: [
          { label: "읽기 완료일", value: String(data.date || "") },
          { label: "누적 횟수", value: `${Number(data.read_count || 1)}회` },
        ],
      };
    }

    if (activity.sourceTable === "verse_bookmarks") {
      const { data, error } = await supabase
        .from("verse_bookmarks")
        .select("source, verse_ref, content, memo, created_at")
        .eq("id", rowId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return fallback;

      return {
        kind: "bookmark",
        title: data.verse_ref || activity.title,
        subtitle: formatDateTime(data.created_at || activity.occurredAt),
        reference: data.verse_ref || null,
        body: data.memo || data.content || null,
        audioUrl: null,
        audioDuration: 0,
        meta: [{ label: "저장 출처", value: String(data.source || "") }].filter((item) => item.value),
      };
    }

    if (activity.sourceTable === "group_faith_records") {
      const { data, error } = await supabase
        .from("group_faith_records")
        .select("item_id, record_date, value, note, created_at")
        .eq("id", rowId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return fallback;

      let itemName = "모임 신앙기록";
      if (data.item_id) {
        const itemResult = await supabase.from("group_faith_items").select("name").eq("id", data.item_id).maybeSingle();
        if (!itemResult.error && itemResult.data?.name) {
          itemName = itemResult.data.name;
        }
      }

      return {
        kind: "faith",
        title: itemName,
        subtitle: formatDateTime(data.created_at || activity.occurredAt),
        reference: activity.sourceGroupName,
        body: data.note || null,
        audioUrl: null,
        audioDuration: 0,
        meta: [
          { label: "기록일", value: String(data.record_date || "") },
          { label: "값", value: String(data.value ?? "") },
        ].filter((item) => item.value),
      };
    }
  } catch (error) {
    console.warn("dashboard activity detail fallback:", error);
  }

  return fallback;
}
