import { supabase } from "./supabase";
import type {
  DashboardActivityItem,
  DashboardActivityLink,
  DashboardActivitySourceKind,
  DashboardActivityType,
  DashboardGroupContext,
  DashboardGroupRole,
  TimeframeDays,
} from "./dashboard";

export type InsightsPillarKey = "reading" | "qt" | "prayer";
export type InsightTone = "warm" | "watch" | "quiet";

export type InsightsTrendPoint = {
  date: string;
  label: string;
  reading: number;
  qt: number;
  prayer: number;
  total: number;
};

export type InsightsPillarConnectionPoint = {
  key: InsightsPillarKey;
  label: string;
  personalOnly: number;
  linked: number;
  direct: number;
  total: number;
};

export type InsightsPillarCard = {
  key: InsightsPillarKey;
  label: string;
  total: number;
  activeDays: number;
  streak: number;
  linkedCount: number;
  directCount: number;
  personalOnlyCount: number;
  connectedRate: number;
  lastActivityAt: string | null;
  note: string;
};

export type InsightsGroupShareRow = {
  groupId: string;
  groupName: string;
  reading: number;
  qt: number;
  prayer: number;
  total: number;
};

export type InsightsSummary = {
  coreTotal: number;
  activeDays: number;
  streak: number;
  linkedCount: number;
  directCount: number;
  personalOnlyCount: number;
  connectedRate: number;
  bookmarkCount: number;
};

export type InsightsPersonalData = {
  summary: InsightsSummary;
  pillars: InsightsPillarCard[];
  trend: InsightsTrendPoint[];
  connectionBreakdown: InsightsPillarConnectionPoint[];
  groupShares: InsightsGroupShareRow[];
  recent: DashboardActivityItem[];
};

export type InsightsGroupSignal = {
  groupId: string;
  groupName: string;
  depth: number;
  memberCount: number;
  pendingCount: number;
  activeMemberCount: number;
  quietMemberCount: number;
  readingCount: number;
  qtCount: number;
  prayerCount: number;
  linkedCount: number;
  directCount: number;
  lastActivityAt: string | null;
  lastReadingAt: string | null;
  lastQtAt: string | null;
  lastPrayerAt: string | null;
  tone: InsightTone;
  note: string;
};

export type InsightsCareMember = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: DashboardGroupRole;
  readingCount: number;
  qtCount: number;
  prayerCount: number;
  linkedCount: number;
  directCount: number;
  lastActivityAt: string | null;
  lastReadingAt: string | null;
  lastQtAt: string | null;
  lastPrayerAt: string | null;
  quietDays: number;
  tone: InsightTone;
  note: string;
};

export type InsightsPendingRequest = {
  id: string;
  name: string;
  createdAt: string;
};

export type InsightsGroupData = {
  group: DashboardGroupContext;
  canManage: boolean;
  summary: InsightsSummary;
  pillars: InsightsPillarCard[];
  trend: InsightsTrendPoint[];
  connectionBreakdown: InsightsPillarConnectionPoint[];
  groupShares: InsightsGroupShareRow[];
  recent: DashboardActivityItem[];
  groupSignal: InsightsGroupSignal | null;
  groupTimeline: InsightsTrendPoint[];
  careMembers: InsightsCareMember[];
  pendingRequests: InsightsPendingRequest[];
};

export type InsightsNetworkPillar = {
  key: InsightsPillarKey;
  label: string;
  total: number;
  groupCount: number;
  lastActivityAt: string | null;
  note: string;
};

export type InsightsNetworkData = {
  mode: "managed" | "scope";
  summary: {
    groupCount: number;
    memberCount: number;
    activeMemberCount: number;
    quietMemberCount: number;
    pendingCount: number;
    linkedRate: number;
  };
  pillars: InsightsNetworkPillar[];
  timeline: InsightsTrendPoint[];
  groups: InsightsGroupSignal[];
  limitedMessage: string | null;
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

type CoreSummaryRpcRow = {
  group_id: string;
  group_name: string;
  depth: number | null;
  member_count: number | null;
  pending_count: number | null;
  active_member_count: number | null;
  quiet_member_count: number | null;
  reading_count: number | null;
  qt_count: number | null;
  prayer_count: number | null;
  linked_count: number | null;
  direct_count: number | null;
  last_activity_at: string | null;
  last_reading_at: string | null;
  last_qt_at: string | null;
  last_prayer_at: string | null;
};

type TimelineRpcRow = {
  bucket_date: string;
  reading_count: number | null;
  qt_count: number | null;
  prayer_count: number | null;
  linked_count: number | null;
  direct_count: number | null;
};

type MemberSignalRpcRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  reading_count: number | null;
  qt_count: number | null;
  prayer_count: number | null;
  linked_count: number | null;
  direct_count: number | null;
  last_activity_at: string | null;
  last_reading_at: string | null;
  last_qt_at: string | null;
  last_prayer_at: string | null;
  quiet_days: number | null;
};

const CORE_PILLARS: InsightsPillarKey[] = ["reading", "qt", "prayer"];

export const INSIGHT_PILLAR_META: Record<
  InsightsPillarKey,
  { label: string; color: string }
> = {
  reading: { label: "성경읽기", color: "#2F5B91" },
  qt: { label: "QT", color: "#48624E" },
  prayer: { label: "기도", color: "#C47D2C" },
};

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

function toGroupRole(value: unknown): DashboardGroupRole {
  if (value === "owner" || value === "leader") return value;
  return "member";
}

function fetchRelativeDays(dateLike: string | null) {
  if (!dateLike) return null;
  const current = new Date();
  current.setHours(0, 0, 0, 0);
  const target = new Date(dateLike);
  target.setHours(0, 0, 0, 0);
  return Math.max(Math.round((current.getTime() - target.getTime()) / 86400000), 0);
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

function describeActivity(
  row: RawActivityRow,
  linkedGroups: DashboardActivityLink[],
  sourceGroupName: string | null,
) {
  const payload = row.payload || {};

  if (row.activity_type === "qt") {
    const reference = buildQtReference(payload);
    return {
      title: reference ? `QT 묵상 · ${reference}` : "QT 묵상",
      summary:
        payload.meditation_excerpt ||
        (payload.meditation_type === "audio"
          ? "음성 묵상을 남겼습니다."
          : "묵상 기록을 남겼습니다."),
      reference,
      audioUrl: typeof payload.audio_url === "string" ? payload.audio_url : null,
      audioDuration: Number(payload.audio_duration || 0),
    };
  }

  if (row.activity_type === "prayer") {
    const linkedLabel =
      sourceGroupName ||
      (linkedGroups.length === 1
        ? linkedGroups[0].name
        : linkedGroups.length > 1
          ? `${linkedGroups.length}개 모임 연결`
          : null);
    return {
      title:
        payload.title ||
        (row.source_kind === "group_direct" ? "모임 음성기도" : "음성 기도"),
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

async function fetchGroupNames(groupIds: string[]) {
  if (groupIds.length === 0) return new Map<string, string>();

  const { data, error } = await supabase
    .from("groups")
    .select("id, name")
    .in("id", groupIds);
  if (error) throw error;

  const map = new Map<string, string>();
  (data ?? []).forEach((row: any) => {
    if (row?.id && row?.name) {
      map.set(String(row.id), String(row.name));
    }
  });
  return map;
}

function normalizeActivityRows(
  rawRows: RawActivityRow[],
  linkMap: Map<string, DashboardActivityLink[]>,
  sourceGroupMap: Map<string, string>,
) {
  return rawRows.map((row) => {
    const links = linkMap.get(String(row.id)) ?? [];
    const sourceGroupName = row.source_group_id
      ? sourceGroupMap.get(row.source_group_id) || null
      : null;
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
    .select(
      "id, activity_type, source_kind, source_group_id, source_table, source_row_id, payload, occurred_at",
    )
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

function toPillarKey(type: DashboardActivityType): InsightsPillarKey | null {
  if (type === "reading" || type === "qt" || type === "prayer") return type;
  return null;
}

function isCoreActivity(item: DashboardActivityItem) {
  return toPillarKey(item.type) !== null;
}

function buildTrend(days: TimeframeDays, activities: DashboardActivityItem[]) {
  const map = new Map<string, InsightsTrendPoint>();
  buildDateBuckets(days).forEach((date) => {
    const key = toDateKey(date);
    map.set(key, {
      date: key,
      label: formatShortDate(date),
      reading: 0,
      qt: 0,
      prayer: 0,
      total: 0,
    });
  });

  activities.forEach((activity) => {
    const pillar = toPillarKey(activity.type);
    if (!pillar) return;
    const point = map.get(toDateKey(activity.occurredAt));
    if (!point) return;
    point[pillar] += 1;
    point.total += 1;
  });

  return Array.from(map.values());
}

function createPillarNote(
  label: string,
  total: number,
  streak: number,
  lastActivityAt: string | null,
  connectedRate: number,
) {
  if (total === 0) {
    return `${label} 흔적이 아직 보이지 않습니다.`;
  }

  if (streak >= 3) {
    return `최근 ${streak}일 동안 ${label} 흐름이 이어지고 있습니다.`;
  }

  const quietDays = fetchRelativeDays(lastActivityAt);
  if (quietDays !== null && quietDays >= 7) {
    return `최근에는 ${label}이 조금 조용했습니다.`;
  }

  if (connectedRate >= 60) {
    return `${label} 기록이 모임과 자주 이어지고 있습니다.`;
  }

  if (connectedRate === 0) {
    return `${label}은 아직 주로 개인 기록으로 남아 있습니다.`;
  }

  return `${label}이 개인과 모임 안에서 함께 이어지고 있습니다.`;
}

function buildPillarCard(
  key: InsightsPillarKey,
  activities: DashboardActivityItem[],
): InsightsPillarCard {
  const typed = activities.filter((activity) => activity.type === key);
  const activeDateKeys = new Set(typed.map((activity) => toDateKey(activity.occurredAt)));
  const linkedCount = typed.filter((activity) => activity.linkedGroups.length > 0).length;
  const directCount = typed.filter((activity) => activity.sourceKind === "group_direct").length;
  const personalOnlyCount = typed.filter(
    (activity) =>
      activity.sourceKind === "personal" && activity.linkedGroups.length === 0,
  ).length;
  const total = typed.length;
  const connectedRate =
    total > 0 ? Math.round(((linkedCount + directCount) / total) * 100) : 0;
  const label = INSIGHT_PILLAR_META[key].label;

  return {
    key,
    label,
    total,
    activeDays: activeDateKeys.size,
    streak: computeStreak(activeDateKeys),
    linkedCount,
    directCount,
    personalOnlyCount,
    connectedRate,
    lastActivityAt: typed[0]?.occurredAt || null,
    note: createPillarNote(label, total, computeStreak(activeDateKeys), typed[0]?.occurredAt || null, connectedRate),
  };
}

function buildPillarConnectionBreakdown(activities: DashboardActivityItem[]) {
  return CORE_PILLARS.map((key) => {
    const typed = activities.filter((activity) => activity.type === key);
    const linked = typed.filter((activity) => activity.linkedGroups.length > 0).length;
    const direct = typed.filter((activity) => activity.sourceKind === "group_direct").length;
    const personalOnly = typed.filter(
      (activity) =>
        activity.sourceKind === "personal" && activity.linkedGroups.length === 0,
    ).length;

    return {
      key,
      label: INSIGHT_PILLAR_META[key].label,
      personalOnly,
      linked,
      direct,
      total: typed.length,
    } satisfies InsightsPillarConnectionPoint;
  });
}

function buildGroupShares(activities: DashboardActivityItem[]) {
  const map = new Map<string, InsightsGroupShareRow>();

  activities.forEach((activity) => {
    const pillar = toPillarKey(activity.type);
    if (!pillar) return;

    const targets = new Map<string, string>();
    if (activity.sourceGroupId && activity.sourceGroupName) {
      targets.set(activity.sourceGroupId, activity.sourceGroupName);
    }
    activity.linkedGroups.forEach((group) => targets.set(group.id, group.name));

    targets.forEach((groupName, groupId) => {
      const current =
        map.get(groupId) ??
        ({
          groupId,
          groupName,
          reading: 0,
          qt: 0,
          prayer: 0,
          total: 0,
        } satisfies InsightsGroupShareRow);
      current[pillar] += 1;
      current.total += 1;
      map.set(groupId, current);
    });
  });

  return Array.from(map.values()).sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.groupName.localeCompare(b.groupName, "ko");
  });
}

function buildSummary(
  coreActivities: DashboardActivityItem[],
  recent: DashboardActivityItem[],
): InsightsSummary {
  const activeDateKeys = new Set(coreActivities.map((activity) => toDateKey(activity.occurredAt)));
  const linkedCount = coreActivities.filter(
    (activity) => activity.linkedGroups.length > 0,
  ).length;
  const directCount = coreActivities.filter(
    (activity) => activity.sourceKind === "group_direct",
  ).length;
  const personalOnlyCount = coreActivities.filter(
    (activity) =>
      activity.sourceKind === "personal" && activity.linkedGroups.length === 0,
  ).length;
  const bookmarkCount = recent.filter((activity) => activity.type === "bookmark").length;

  return {
    coreTotal: coreActivities.length,
    activeDays: activeDateKeys.size,
    streak: computeStreak(activeDateKeys),
    linkedCount,
    directCount,
    personalOnlyCount,
    connectedRate:
      coreActivities.length > 0
        ? Math.round(((linkedCount + directCount) / coreActivities.length) * 100)
        : 0,
    bookmarkCount,
  };
}

function filterActivitiesForGroup(
  activities: DashboardActivityItem[],
  groupId: string,
) {
  return activities.filter(
    (activity) =>
      activity.sourceGroupId === groupId ||
      activity.linkedGroups.some((group) => group.id === groupId),
  );
}

function mapGroupSignal(row: CoreSummaryRpcRow): InsightsGroupSignal {
  const readingCount = Number(row.reading_count || 0);
  const qtCount = Number(row.qt_count || 0);
  const prayerCount = Number(row.prayer_count || 0);
  const memberCount = Number(row.member_count || 0);
  const quietMemberCount = Number(row.quiet_member_count || 0);
  const pendingCount = Number(row.pending_count || 0);
  const activeMemberCount = Number(row.active_member_count || 0);
  const total = readingCount + qtCount + prayerCount;

  let tone: InsightTone = "warm";
  let note = "읽기, QT, 기도 흐름을 차분히 살펴볼 수 있습니다.";

  if (total === 0) {
    tone = "quiet";
    note = "이번 기간에는 세 축의 기록이 조용했습니다.";
  } else if (memberCount > 0 && quietMemberCount >= Math.max(2, Math.ceil(memberCount * 0.4))) {
    tone = "watch";
    note = "조용한 시간이 길어진 모임원이 보여 안부를 먼저 나누기 좋습니다.";
  } else if (pendingCount > 0) {
    tone = "watch";
    note = "가입을 기다리는 분이 있어 함께 맞이할 준비를 살펴볼 수 있습니다.";
  } else if (readingCount > 0 && qtCount > 0 && prayerCount > 0) {
    tone = "warm";
    note = "성경읽기, QT, 기도가 고르게 이어지고 있습니다.";
  } else if (prayerCount >= readingCount && prayerCount >= qtCount) {
    tone = "warm";
    note = "최근에는 기도 흐름이 가장 또렷하게 보입니다.";
  } else if (readingCount >= qtCount) {
    tone = "warm";
    note = "최근에는 말씀 읽기 흐름이 비교적 꾸준합니다.";
  } else {
    tone = "warm";
    note = "최근에는 QT 흐름이 비교적 꾸준합니다.";
  }

  return {
    groupId: row.group_id,
    groupName: row.group_name,
    depth: Number(row.depth || 0),
    memberCount,
    pendingCount,
    activeMemberCount,
    quietMemberCount,
    readingCount,
    qtCount,
    prayerCount,
    linkedCount: Number(row.linked_count || 0),
    directCount: Number(row.direct_count || 0),
    lastActivityAt: row.last_activity_at,
    lastReadingAt: row.last_reading_at,
    lastQtAt: row.last_qt_at,
    lastPrayerAt: row.last_prayer_at,
    tone,
    note,
  };
}

function mapMemberSignal(row: MemberSignalRpcRow): InsightsCareMember {
  const readingCount = Number(row.reading_count || 0);
  const qtCount = Number(row.qt_count || 0);
  const prayerCount = Number(row.prayer_count || 0);
  const quietDays = Number(row.quiet_days || 0);
  const touchedCount = [readingCount, qtCount, prayerCount].filter((value) => value > 0)
    .length;

  let tone: InsightTone = "warm";
  let note = "최근 핵심 활동의 흔적이 이어지고 있습니다.";

  if (!row.last_activity_at) {
    tone = "quiet";
    note = "이번 기간에는 아직 핵심 활동 기록이 보이지 않습니다.";
  } else if (quietDays >= 14) {
    tone = "watch";
    note = "조용한 시간이 길어 안부를 먼저 나눠볼 만합니다.";
  } else if (touchedCount >= 2) {
    tone = "warm";
    note = "여러 축에서 함께 기록이 이어지고 있습니다.";
  } else if (prayerCount > 0) {
    tone = "warm";
    note = "최근에는 기도 흐름이 가장 먼저 보입니다.";
  } else if (readingCount > 0) {
    tone = "warm";
    note = "최근에는 성경읽기 흐름이 먼저 보입니다.";
  } else {
    tone = "warm";
    note = "최근에는 QT 흐름이 먼저 보입니다.";
  }

  return {
    userId: row.user_id,
    name: row.display_name || "모임원",
    avatarUrl: row.avatar_url || null,
    role: toGroupRole(row.role),
    readingCount,
    qtCount,
    prayerCount,
    linkedCount: Number(row.linked_count || 0),
    directCount: Number(row.direct_count || 0),
    lastActivityAt: row.last_activity_at,
    lastReadingAt: row.last_reading_at,
    lastQtAt: row.last_qt_at,
    lastPrayerAt: row.last_prayer_at,
    quietDays,
    tone,
    note,
  };
}

async function fetchGroupCoreSummary(options: {
  days: TimeframeDays;
  mode?: "managed" | "scope";
  groupId?: string | null;
}) {
  const { days, mode = "managed", groupId = null } = options;
  const { data, error } = await supabase.rpc("get_dashboard_group_core_summary", {
    p_days: days,
    p_scope: mode,
    p_group_id: groupId,
  });
  if (error) throw error;
  return ((data ?? []) as CoreSummaryRpcRow[]).map(mapGroupSignal);
}

async function fetchCoreTimeline(options: {
  days: TimeframeDays;
  mode?: "managed" | "scope";
  groupId?: string | null;
}) {
  const { days, mode = "managed", groupId = null } = options;
  const { data, error } = await supabase.rpc("get_dashboard_core_activity_timeline", {
    p_days: days,
    p_scope: mode,
    p_group_id: groupId,
  });
  if (error) throw error;
  return ((data ?? []) as TimelineRpcRow[]).map((row) => ({
    date: row.bucket_date,
    label: formatShortDate(row.bucket_date),
    reading: Number(row.reading_count || 0),
    qt: Number(row.qt_count || 0),
    prayer: Number(row.prayer_count || 0),
    total:
      Number(row.reading_count || 0) +
      Number(row.qt_count || 0) +
      Number(row.prayer_count || 0),
  }));
}

async function fetchMemberSignals(groupId: string, days: TimeframeDays) {
  const { data, error } = await supabase.rpc("get_dashboard_group_member_signals", {
    p_group_id: groupId,
    p_days: days,
  });
  if (error) throw error;
  return ((data ?? []) as MemberSignalRpcRow[]).map(mapMemberSignal);
}

async function fetchPendingRequests(groupId: string) {
  const { data, error } = await supabase
    .from("group_join_requests")
    .select("id, user_id, created_at")
    .eq("group_id", groupId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;

  const userIds = Array.from(
    new Set((data ?? []).map((row: any) => String(row.user_id))),
  );
  const profilesResult = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, nickname, username")
        .in("id", userIds)
    : { data: [], error: null };

  if (profilesResult.error) throw profilesResult.error;

  const profileMap = new Map<string, string>();
  (profilesResult.data ?? []).forEach((row: any) => {
    profileMap.set(
      String(row.id),
      String(row.nickname || row.username || "가입 대기자"),
    );
  });

  return ((data ?? []) as any[]).map((row) => ({
    id: String(row.id),
    name: profileMap.get(String(row.user_id)) || "가입 대기자",
    createdAt: String(row.created_at),
  })) satisfies InsightsPendingRequest[];
}

function buildNetworkPillars(groups: InsightsGroupSignal[]): InsightsNetworkPillar[] {
  return CORE_PILLARS.map((key) => {
    const label = INSIGHT_PILLAR_META[key].label;
    const total = groups.reduce((sum, group) => {
      const count =
        key === "reading"
          ? group.readingCount
          : key === "qt"
            ? group.qtCount
            : group.prayerCount;
      return sum + count;
    }, 0);
    const touchedGroups = groups.filter((group) => {
      if (key === "reading") return group.readingCount > 0;
      if (key === "qt") return group.qtCount > 0;
      return group.prayerCount > 0;
    });
    const lastActivityAt =
      touchedGroups
        .map((group) =>
          key === "reading"
            ? group.lastReadingAt
            : key === "qt"
              ? group.lastQtAt
              : group.lastPrayerAt,
        )
        .filter(Boolean)
        .sort()
        .reverse()[0] || null;

    let note = `${label} 흐름이 아직 보이지 않습니다.`;
    if (total > 0 && touchedGroups.length > 0) {
      note = `${touchedGroups.length}개 모임에서 ${label} 흔적이 이어졌습니다.`;
    }

    return {
      key,
      label,
      total,
      groupCount: touchedGroups.length,
      lastActivityAt,
      note,
    };
  });
}

export async function fetchInsightsPersonalData(
  userId: string,
  days: TimeframeDays,
): Promise<InsightsPersonalData> {
  const recent = await loadUserActivityItems(userId, days);
  const coreActivities = recent.filter(isCoreActivity);

  return {
    summary: buildSummary(coreActivities, recent),
    pillars: CORE_PILLARS.map((key) => buildPillarCard(key, coreActivities)),
    trend: buildTrend(days, coreActivities),
    connectionBreakdown: buildPillarConnectionBreakdown(coreActivities),
    groupShares: buildGroupShares(coreActivities).slice(0, 8),
    recent: recent.slice(0, 18),
  };
}

export async function fetchInsightsGroupData(
  userId: string,
  group: DashboardGroupContext,
  days: TimeframeDays,
): Promise<InsightsGroupData> {
  const recent = await loadUserActivityItems(userId, days);
  const groupActivities = filterActivitiesForGroup(recent, group.id);
  const coreActivities = groupActivities.filter(isCoreActivity);
  const canManage = group.role === "owner" || group.role === "leader";

  const [groupSignals, groupTimeline, careMembers, pendingRequests] = await Promise.all([
    fetchGroupCoreSummary({ days, groupId: group.id }),
    fetchCoreTimeline({ days, groupId: group.id }),
    canManage ? fetchMemberSignals(group.id, days) : Promise.resolve([]),
    canManage ? fetchPendingRequests(group.id) : Promise.resolve([]),
  ]);

  return {
    group,
    canManage,
    summary: buildSummary(coreActivities, groupActivities),
    pillars: CORE_PILLARS.map((key) => buildPillarCard(key, coreActivities)),
    trend: buildTrend(days, coreActivities),
    connectionBreakdown: buildPillarConnectionBreakdown(coreActivities),
    groupShares: buildGroupShares(coreActivities).filter((row) => row.groupId === group.id),
    recent: groupActivities.slice(0, 18),
    groupSignal: groupSignals[0] || null,
    groupTimeline,
    careMembers,
    pendingRequests,
  };
}

export async function fetchInsightsNetworkData(options: {
  mode: "managed" | "scope";
  days: TimeframeDays;
}): Promise<InsightsNetworkData> {
  const { mode, days } = options;

  try {
    const [groups, timeline] = await Promise.all([
      fetchGroupCoreSummary({ days, mode }),
      fetchCoreTimeline({ days, mode }),
    ]);

    const totalLinked = groups.reduce((sum, group) => sum + group.linkedCount, 0);
    const totalDirect = groups.reduce((sum, group) => sum + group.directCount, 0);

    return {
      mode,
      summary: {
        groupCount: groups.length,
        memberCount: groups.reduce((sum, group) => sum + group.memberCount, 0),
        activeMemberCount: groups.reduce(
          (sum, group) => sum + group.activeMemberCount,
          0,
        ),
        quietMemberCount: groups.reduce(
          (sum, group) => sum + group.quietMemberCount,
          0,
        ),
        pendingCount: groups.reduce((sum, group) => sum + group.pendingCount, 0),
        linkedRate:
          totalLinked + totalDirect > 0
            ? Math.round((totalLinked / (totalLinked + totalDirect)) * 100)
            : 0,
      },
      pillars: buildNetworkPillars(groups),
      timeline,
      groups,
      limitedMessage: null,
    };
  } catch (error) {
    console.warn("insights network fallback:", error);
    return {
      mode,
      summary: {
        groupCount: 0,
        memberCount: 0,
        activeMemberCount: 0,
        quietMemberCount: 0,
        pendingCount: 0,
        linkedRate: 0,
      },
      pillars: CORE_PILLARS.map((key) => ({
        key,
        label: INSIGHT_PILLAR_META[key].label,
        total: 0,
        groupCount: 0,
        lastActivityAt: null,
        note: `${INSIGHT_PILLAR_META[key].label} 흐름을 아직 불러오지 못했습니다.`,
      })),
      timeline: [],
      groups: [],
      limitedMessage:
        "리더/상위리더 돌봄 지표는 최신 대시보드 RPC가 적용된 뒤 전체 표시됩니다.",
    };
  }
}
