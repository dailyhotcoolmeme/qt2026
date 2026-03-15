import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useHashLocation } from "wouter/use-hash-location";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BookMarked,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronRight,
  Clock3,
  Crown,
  Flame,
  LayoutDashboard,
  Link2,
  Menu,
  Mic,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  UserRound,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../hooks/use-auth";
import {
  fetchDashboardActivityDetail,
  fetchDashboardContexts,
  fetchGroupDashboardData,
  fetchNetworkDashboardData,
  fetchPersonalDashboardData,
  type DashboardActivityDetail,
  type DashboardActivityItem,
  type DashboardActivityType,
  type DashboardContextKind,
  type DashboardGroupContext,
  type DashboardGroupRole,
} from "../lib/dashboard";
import { cn } from "../lib/utils";
import { useDashboardShellStore, type DashboardSubtab } from "../stores/dashboard-shell-store";
import { AudioRecordPlayer } from "../components/AudioRecordPlayer";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../components/ui/chart";
import { ScrollArea } from "../components/ui/scroll-area";
import { Separator } from "../components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

const PERSONAL_DAILY_CONFIG = {
  qt: { label: "QT", color: "#48624E" },
  prayer: { label: "기도", color: "#C47D2C" },
  reading: { label: "성경읽기", color: "#2F5B91" },
  bookmark: { label: "말씀저장", color: "#8A4F33" },
};

const PERSONAL_RHYTHM_CONFIG = {
  weekday: { label: "활동 수", color: "#48624E" },
  time: { label: "활동 수", color: "#C47D2C" },
};

const GROUP_COMPARE_CONFIG = {
  myTotal: { label: "내 활동", color: "#48624E" },
  groupTotal: { label: "모임 전체", color: "#C47D2C" },
};

const NETWORK_TIMELINE_CONFIG = {
  prayer: { label: "음성기도", color: "#48624E" },
  faith: { label: "신앙기록", color: "#C47D2C" },
  posts: { label: "교제나눔", color: "#2F5B91" },
  linked: { label: "연결 활동", color: "#8A4F33" },
};

const MIX_COLORS = ["#48624E", "#C47D2C", "#2F5B91", "#8A4F33"];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(new Date(value));
}

function roleLabel(role: DashboardGroupRole) {
  if (role === "owner") return "모임장";
  if (role === "leader") return "리더";
  return "일반멤버";
}

function roleTone(role: DashboardGroupRole) {
  if (role === "owner") return "bg-[#48624E] text-white";
  if (role === "leader") return "bg-[#EAF1E4] text-[#48624E]";
  return "bg-[#EFEAE1] text-[#7B6D5C]";
}

function getContextTitle(kind: DashboardContextKind, group?: DashboardGroupContext | null, networkMode?: "managed" | "scope") {
  if (kind === "personal") {
    return {
      badge: "내 활동",
      title: "개인 수행 리듬",
      description: "얼마나 꾸준히 기록했고, 어떤 시간대와 어떤 활동에 더 집중하는지 한 화면에서 봅니다.",
    };
  }
  if (kind === "network") {
    return {
      badge: networkMode === "scope" ? "상위리더 범위" : "관리 범위",
      title: networkMode === "scope" ? "조직 비교 인사이트" : "운영 흐름 인사이트",
      description:
        networkMode === "scope"
          ? "여러 모임의 흐름을 비교하고, 어떤 조직이 올라오고 내려가는지 먼저 확인합니다."
          : "내가 관리하는 모임들의 참여 흐름과 운영 부담이 어디에 몰리는지 빠르게 훑습니다.",
    };
  }
  return {
    badge: group ? roleLabel(group.role) : "선택한 모임",
    title: group?.name || "모임 인사이트",
    description: "선택한 모임 안에서 내가 어떤 활동을 남겼고, 리더라면 누가 뜨고 누가 쉬고 있는지까지 이어서 봅니다.",
  };
}

function iconForActivity(type: DashboardActivityType) {
  if (type === "qt") return <Sparkles className="h-4 w-4" />;
  if (type === "prayer") return <Mic className="h-4 w-4" />;
  if (type === "reading") return <BookOpen className="h-4 w-4" />;
  return <BookMarked className="h-4 w-4" />;
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <Card className="rounded-[28px] border-dashed border-[#D5CCBB] bg-white/80 shadow-none">
      <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1EBDC] text-[#8D7A63]">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <div className="font-black text-zinc-900">{title}</div>
          <div className="mt-1 max-w-sm text-sm leading-6 text-zinc-500">{description}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[26px] border border-white/70 bg-white/85 p-4 shadow-sm">
      <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8D7A63]">{label}</div>
      <div className="mt-3 text-3xl font-black leading-none text-zinc-900">{value}</div>
      <div className="mt-3 text-sm leading-6 text-zinc-500">{note}</div>
    </div>
  );
}

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <span className="h-6 w-1.5 rounded-full bg-[#48624E]" />
          <h2 className="text-xl font-black text-zinc-900">{title}</h2>
        </div>
        {description && <p className="mt-3 pl-4 text-sm leading-6 text-zinc-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function HeatmapGrid({
  cells,
}: {
  cells: Array<{ date: string; label: string; total: number; level: 0 | 1 | 2 | 3 | 4 }>;
}) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {cells.map((cell) => (
        <div
          key={cell.date}
          title={`${cell.label} · ${cell.total}회`}
          className={cn(
            "flex h-11 items-end rounded-2xl border border-white/70 px-2 py-2 text-[11px] font-bold transition-transform hover:-translate-y-0.5",
            cell.level === 0 && "bg-[#F7F2E9] text-[#B4A28C]",
            cell.level === 1 && "bg-[#EAF1E4] text-[#6A7D65]",
            cell.level === 2 && "bg-[#D6E5D0] text-[#48624E]",
            cell.level === 3 && "bg-[#BDD4B6] text-[#35503A]",
            cell.level === 4 && "bg-[#48624E] text-white",
          )}
        >
          <div className="w-full">
            <div>{cell.label}</div>
            <div className="mt-1 text-right">{cell.total}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function GroupRolePill({ role }: { role: DashboardGroupRole }) {
  return <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-black", roleTone(role))}>{roleLabel(role)}</span>;
}

function ContextButton({
  active,
  icon,
  title,
  subtitle,
  badge,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-[24px] border px-4 py-4 text-left transition-all",
        active
          ? "border-[#48624E]/30 bg-[#48624E] text-white shadow-lg shadow-[#48624E]/20"
          : "border-white/70 bg-white/85 text-zinc-800 hover:-translate-y-0.5 hover:bg-white",
      )}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("rounded-2xl p-2.5", active ? "bg-white/15" : "bg-[#F3EEE4] text-[#48624E]")}>{icon}</div>
        {badge}
      </div>
      <div className="mt-4">
        <div className="font-black">{title}</div>
        <div className={cn("mt-1 text-sm leading-6", active ? "text-white/72" : "text-zinc-500")}>{subtitle}</div>
      </div>
    </button>
  );
}

function ActivityRow({
  item,
  onClick,
}: {
  item: DashboardActivityItem;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-[24px] border border-[#E5DDCF] bg-white px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-[#D6CCBC]"
      type="button"
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3EEE4] text-[#48624E]">
          {iconForActivity(item.type)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate text-sm font-black text-zinc-900">{item.title}</div>
                {item.audioUrl && (
                  <span className="rounded-full bg-[#EAF1E4] px-2 py-0.5 text-[11px] font-bold text-[#48624E]">오디오</span>
                )}
                {item.sourceKind === "group_direct" && (
                  <span className="rounded-full bg-[#F4EADA] px-2 py-0.5 text-[11px] font-bold text-[#A16726]">직접</span>
                )}
                {item.linkedGroups.length > 0 && (
                  <span className="rounded-full bg-[#E8EEF7] px-2 py-0.5 text-[11px] font-bold text-[#2F5B91]">
                    연결 {item.linkedGroups.length}
                  </span>
                )}
              </div>
              <div className="mt-2 text-sm leading-6 text-zinc-600">{item.summary}</div>
            </div>
            <div className="shrink-0 text-xs font-bold text-zinc-400">{formatDateTime(item.occurredAt)}</div>
          </div>

          {(item.reference || item.sourceGroupName || item.linkedGroups.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.reference && (
                <span className="rounded-full bg-[#F5F0E6] px-2.5 py-1 text-[11px] font-bold text-[#7B6D5C]">{item.reference}</span>
              )}
              {item.sourceGroupName && (
                <span className="rounded-full bg-[#EAF1E4] px-2.5 py-1 text-[11px] font-bold text-[#48624E]">{item.sourceGroupName}</span>
              )}
              {item.linkedGroups.map((group) => (
                <span key={`${item.id}-${group.id}`} className="rounded-full bg-[#E8EEF7] px-2.5 py-1 text-[11px] font-bold text-[#2F5B91]">
                  {group.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function SidebarMenu({
  contexts,
  contextKind,
  selectedGroupId,
  networkMode,
  timeframe,
  onContextChange,
  onNetworkModeChange,
  onTimeframeChange,
}: {
  contexts: Awaited<ReturnType<typeof fetchDashboardContexts>>;
  contextKind: DashboardContextKind;
  selectedGroupId: string | null;
  networkMode: "managed" | "scope";
  timeframe: 7 | 30 | 90;
  onContextChange: (kind: DashboardContextKind, groupId?: string | null) => void;
  onNetworkModeChange: (mode: "managed" | "scope") => void;
  onTimeframeChange: (days: 7 | 30 | 90) => void;
}) {
  const hasNetwork = contexts.summary.hasNetworkAccess;
  const hasScope = contexts.summary.hasScopeAccess;

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-sm">
        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8D7A63]">Insights</div>
        <div className="mt-3 font-['Noto_Serif_KR'] text-2xl font-black leading-tight text-zinc-900">활동 인사이트</div>
        <div className="mt-2 text-sm leading-6 text-zinc-500">
          앱에서 바로 이어지는 분석 화면을 염두에 두고 만든 독립형 대시보드입니다.
        </div>
      </div>

      <div className="rounded-[30px] border border-white/70 bg-white/85 p-3 shadow-sm">
        <div className="px-3 pt-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#8D7A63]">Context</div>
        <div className="mt-3 space-y-3">
          <ContextButton
            active={contextKind === "personal"}
            icon={<Sparkles className="h-4 w-4" />}
            title="내 활동"
            subtitle="개인 수행 패턴, 최근 기록, 연결된 모임 흐름"
            onClick={() => onContextChange("personal")}
          />

          {hasNetwork && (
            <ContextButton
              active={contextKind === "network"}
              icon={networkMode === "scope" ? <Crown className="h-4 w-4" /> : <Network className="h-4 w-4" />}
              title={networkMode === "scope" ? "상위리더 범위" : "관리 범위"}
              subtitle={networkMode === "scope" ? "조직 비교, 그룹 간 온도 차이" : "내가 관리하는 모임들의 운영 흐름"}
              badge={
                hasScope ? (
                  <div className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-black tracking-[0.16em] text-white">scope</div>
                ) : undefined
              }
              onClick={() => onContextChange("network")}
            />
          )}
        </div>

        {hasNetwork && (
          <div className="mt-5 px-3">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8D7A63]">Mode</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => onNetworkModeChange("managed")}
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm font-black transition",
                  networkMode === "managed" ? "bg-[#48624E] text-white" : "bg-[#F3EEE4] text-[#7B6D5C]",
                )}
                type="button"
              >
                리더 범위
              </button>
              <button
                onClick={() => hasScope && onNetworkModeChange("scope")}
                disabled={!hasScope}
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm font-black transition",
                  networkMode === "scope" ? "bg-[#2E4C4C] text-white" : "bg-[#F3EEE4] text-[#7B6D5C]",
                  !hasScope && "cursor-not-allowed opacity-40",
                )}
                type="button"
              >
                상위리더
              </button>
            </div>
          </div>
        )}

        <Separator className="my-5 bg-[#E7DDCC]" />

        <div className="px-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#8D7A63]">Groups</div>
        <ScrollArea className="mt-3 h-[320px] pr-2">
          <div className="space-y-2">
            {contexts.groups.map((group) => (
              <button
                key={group.id}
                onClick={() => onContextChange("group", group.id)}
                className={cn(
                  "w-full rounded-[20px] border px-3 py-3 text-left transition",
                  contextKind === "group" && selectedGroupId === group.id
                    ? "border-[#48624E]/30 bg-[#48624E] text-white"
                    : "border-transparent bg-[#F7F2E8] hover:bg-white",
                )}
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-black">{group.name}</div>
                    <div className={cn("mt-1 text-xs", contextKind === "group" && selectedGroupId === group.id ? "text-white/70" : "text-zinc-500")}>
                      {group.scopeDepth !== null ? `상위리더 범위 depth ${group.scopeDepth}` : "개인 모임 컨텍스트"}
                    </div>
                  </div>
                  <GroupRolePill role={group.role} />
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="rounded-[30px] border border-white/70 bg-white/85 p-4 shadow-sm">
        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8D7A63]">Window</div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => onTimeframeChange(days as 7 | 30 | 90)}
              className={cn(
                "rounded-2xl px-3 py-2 text-sm font-black transition",
                timeframe === days ? "bg-zinc-900 text-white" : "bg-[#F3EEE4] text-[#7B6D5C]",
              )}
              type="button"
            >
              {days}일
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActivityDetailSheet({
  open,
  onOpenChange,
  activity,
  detail,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: DashboardActivityItem | null;
  detail: DashboardActivityDetail | undefined;
  loading: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full border-l border-[#E7DDCC] bg-[#F7F1E7] px-0 sm:max-w-[560px]">
        <SheetHeader className="border-b border-[#E7DDCC] px-6 py-5 text-left">
          <SheetTitle className="font-['Noto_Serif_KR'] text-2xl font-black text-zinc-900">기록 상세</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-88px)]">
          <div className="space-y-5 px-6 py-6">
            {loading || !activity ? (
              <Card className="rounded-[28px] border-[#E5DDCF] bg-white/90">
                <CardContent className="flex min-h-[240px] items-center justify-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#48624E] border-t-transparent" />
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="overflow-hidden rounded-[30px] border-[#DCD0BE] bg-white/95">
                  <CardContent className="p-0">
                    <div className="bg-gradient-to-r from-[#48624E] via-[#5F7A64] to-[#B17935] px-6 py-6 text-white">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                          {iconForActivity(activity.type)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-xl font-black">{detail?.title || activity.title}</div>
                          <div className="mt-1 text-sm text-white/75">{detail?.subtitle || formatDateTime(activity.occurredAt)}</div>
                        </div>
                      </div>

                      {(activity.sourceGroupName || activity.linkedGroups.length > 0) && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {activity.sourceGroupName && (
                            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">{activity.sourceGroupName}</span>
                          )}
                          {activity.linkedGroups.map((group) => (
                            <span key={`${activity.id}-detail-${group.id}`} className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">
                              {group.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-5 px-6 py-6">
                      {(detail?.audioUrl || activity.audioUrl) && (
                        <div className="rounded-[24px] bg-[#F7F2E8] p-3">
                          <AudioRecordPlayer
                            src={detail?.audioUrl || activity.audioUrl || undefined}
                            title={detail?.title || activity.title}
                            subtitle={detail?.subtitle || formatDateTime(activity.occurredAt)}
                            className="border-none bg-white shadow-none"
                          />
                        </div>
                      )}

                      {(detail?.reference || activity.reference) && (
                        <div className="rounded-[24px] border border-[#E7DDCC] bg-[#F7F2E8] px-4 py-4">
                          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8D7A63]">Reference</div>
                          <div className="mt-2 text-base font-bold text-zinc-900">{detail?.reference || activity.reference}</div>
                        </div>
                      )}

                      {detail?.body && (
                        <div className="rounded-[28px] border border-[#E7DDCC] bg-white px-5 py-5">
                          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8D7A63]">Content</div>
                          <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-700">{detail.body}</div>
                        </div>
                      )}

                      {detail?.meta?.length ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {detail.meta.map((item) => (
                            <div key={`${item.label}-${item.value}`} className="rounded-[22px] border border-[#E7DDCC] bg-white px-4 py-4">
                              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8D7A63]">{item.label}</div>
                              <div className="mt-2 text-sm font-bold text-zinc-900">{item.value}</div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function PersonalSummaryView({
  data,
  onOpenActivity,
}: {
  data: Awaited<ReturnType<typeof fetchPersonalDashboardData>>;
  onOpenActivity: (activity: DashboardActivityItem) => void;
}) {
  const mixData = data.mix.filter((item) => item.value > 0).map((item) => ({ name: item.label, value: item.value, fill: item.color }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="총 기록" value={`${data.totals.total}`} note="선택한 기간 동안 남긴 전체 활동 수" />
        <StatCard label="연속 수행" value={`${data.totals.streak}일`} note="오늘까지 이어진 개인 수행 흐름" />
        <StatCard label="활동한 날" value={`${data.totals.activeDays}일`} note="기록이 실제로 남은 날짜 수" />
        <StatCard label="모임 연결율" value={`${data.totals.groupTiedRate}%`} note="모임과 연결되었거나 모임 안에서 직접 남긴 기록 비중" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <Card className="rounded-[32px] border-[#DDD2C1] bg-white/92 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black">활동 온도 히트맵</CardTitle>
            <CardDescription>날짜별로 어느 날이 뜨겁고 어느 날이 조용했는지 바로 보이게 만들었습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <HeatmapGrid cells={data.heatmap} />
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-[#DDD2C1] bg-white/92 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black">이번 기간의 결</CardTitle>
            <CardDescription>가장 많이 한 활동과 상대적으로 약한 영역을 짧게 요약합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "가장 강한 영역", value: data.highlights.strongestLabel, icon: Sparkles },
              { label: "가장 약한 영역", value: data.highlights.weakestLabel, icon: Search },
              { label: "가장 잘 움직이는 요일", value: data.highlights.bestWeekdayLabel, icon: CalendarDays },
              { label: "가장 잘 움직이는 시간대", value: data.highlights.bestTimeLabel, icon: Clock3 },
            ].map((item) => (
              <div key={item.label} className="rounded-[24px] bg-[#F7F2E8] px-4 py-4">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#8D7A63]">
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </div>
                <div className="mt-3 text-lg font-black text-zinc-900">{item.value}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <Card className="rounded-[32px] border-[#DDD2C1] bg-white/92 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black">날짜별 활동 흐름</CardTitle>
            <CardDescription>QT, 기도, 읽기, 말씀저장이 어떤 조합으로 이어졌는지 확인합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.daily.some((item) => item.total > 0) ? (
              <ChartContainer className="h-[300px] w-full aspect-auto" config={PERSONAL_DAILY_CONFIG}>
                <AreaChart data={data.daily}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={18} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                  <ChartTooltip content={<ChartTooltipContent hideIndicator={false} />} />
                  <Area type="monotone" dataKey="qt" stroke="var(--color-qt)" fill="var(--color-qt)" fillOpacity={0.24} strokeWidth={2.4} />
                  <Area type="monotone" dataKey="prayer" stroke="var(--color-prayer)" fill="var(--color-prayer)" fillOpacity={0.18} strokeWidth={2.2} />
                  <Area type="monotone" dataKey="reading" stroke="var(--color-reading)" fill="var(--color-reading)" fillOpacity={0.14} strokeWidth={2.1} />
                  <Area type="monotone" dataKey="bookmark" stroke="var(--color-bookmark)" fill="var(--color-bookmark)" fillOpacity={0.12} strokeWidth={2.1} />
                </AreaChart>
              </ChartContainer>
            ) : (
              <EmptyPanel title="아직 개인 활동 흐름이 없습니다" description="기록을 남기기 시작하면 어떤 날에 어떤 활동이 몰리는지 이곳에 그려집니다." />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-[#DDD2C1] bg-white/92 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black">활동 구성 비중</CardTitle>
            <CardDescription>무엇에 시간을 가장 많이 썼는지 비중으로 보게 해 줍니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {mixData.length > 0 ? (
              <ChartContainer
                className="mx-auto h-[280px] w-full max-w-[360px] aspect-auto"
                config={Object.fromEntries(data.mix.map((item) => [item.key, { label: item.label, color: item.color }]))}
              >
                <PieChart>
                  <Pie data={mixData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={5}>
                    {mixData.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.fill || MIX_COLORS[index % MIX_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent hideIndicator nameKey="name" />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <EmptyPanel title="활동 비중이 아직 없습니다" description="한두 개라도 기록이 쌓이면 여기서 패턴이 바로 보이기 시작합니다." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-[32px] border-[#DDD2C1] bg-white/92 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black">요일/시간대 패턴</CardTitle>
            <CardDescription>언제 가장 자연스럽게 수행하는지 패턴을 분리해서 보여줍니다.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <ChartContainer className="h-[250px] w-full aspect-auto" config={PERSONAL_RHYTHM_CONFIG}>
              <BarChart data={data.weekdayPattern}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={22} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--color-weekday)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartContainer>

            <ChartContainer className="h-[250px] w-full aspect-auto" config={PERSONAL_RHYTHM_CONFIG}>
              <BarChart data={data.timePattern}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={22} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--color-time)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-[#DDD2C1] bg-white/92 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black">자주 연결한 모임</CardTitle>
            <CardDescription>개인 기록을 어떤 모임들과 함께 움직이는지 바로 보이도록 정리했습니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.linkedGroups.length > 0 ? (
              data.linkedGroups.map((group, index) => (
                <div key={group.id} className="rounded-[24px] bg-[#F7F2E8] px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8D7A63]">Top {index + 1}</div>
                      <div className="mt-2 truncate text-base font-black text-zinc-900">{group.name}</div>
                    </div>
                    <div className="rounded-full bg-[#EAF1E4] px-3 py-1 text-sm font-black text-[#48624E]">{group.count}회</div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyPanel title="아직 연결된 모임 흐름이 없습니다" description="모임에 연결한 활동이 생기면 여기서 어떤 모임과 가장 많이 맞물리는지 보입니다." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[32px] border-[#DDD2C1] bg-white/92 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-black">최근 기록 미리보기</CardTitle>
          <CardDescription>클릭하면 음성 재생이나 기록 원문까지 바로 내려가서 볼 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.recent.length > 0 ? (
            data.recent.slice(0, 6).map((activity) => (
              <ActivityRow key={activity.id} item={activity} onClick={() => onOpenActivity(activity)} />
            ))
          ) : (
            <EmptyPanel title="최근 기록이 아직 없습니다" description="개인 기록이 쌓이면 최근 기록에서 바로 drill-down 할 수 있게 됩니다." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PersonalRecordsView({
  data,
  onOpenActivity,
}: {
  data: Awaited<ReturnType<typeof fetchPersonalDashboardData>>;
  onOpenActivity: (activity: DashboardActivityItem) => void;
}) {
  return (
    <div className="space-y-6">
      <SectionHeading
        title="최근 개인 기록"
        description="음성 기도, 음성 묵상, 읽기 완료, 말씀 저장까지 모두 한 흐름으로 묶었습니다."
        action={<div className="rounded-full bg-[#F3EEE4] px-3 py-1 text-xs font-black text-[#7B6D5C]">{data.recent.length}건</div>}
      />
      <div className="space-y-3">
        {data.recent.length > 0 ? (
          data.recent.map((activity) => <ActivityRow key={activity.id} item={activity} onClick={() => onOpenActivity(activity)} />)
        ) : (
          <EmptyPanel title="아직 보여줄 기록이 없습니다" description="기록이 생기면 여기서 상세 보기까지 바로 이어집니다." />
        )}
      </div>
    </div>
  );
}

function GroupParticipationView({
  data,
  onOpenActivity,
}: {
  data: Awaited<ReturnType<typeof fetchGroupDashboardData>>;
  onOpenActivity: (activity: DashboardActivityItem) => void;
}) {
  const mixData = data.mix.filter((item) => item.value > 0).map((item) => ({ name: item.label, value: item.value, fill: item.color }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="내 활동" value={`${data.summary.myTotal}`} note="선택한 모임 안에서 남긴 전체 활동 수" />
        <StatCard label="모임 전체" value={`${data.summary.groupTotal}`} note="같은 기간 모임 전체에서 발생한 활동 수" />
        <StatCard label="내 비중" value={`${data.summary.shareRate}%`} note="이 모임 흐름 안에서 내가 차지하는 활동 비중" />
        <StatCard label="모임 연결 구조" value={`${data.summary.linkedCount} / ${data.summary.directCount}`} note="연결한 활동과 모임 안에서 직접 남긴 활동의 대비" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <Card className="rounded-[32px] border-[#DDD2C1] bg-white/92 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black">내 참여 vs 모임 전체</CardTitle>
            <CardDescription>내가 움직인 날과 모임 전체가 움직인 날의 간극을 한 번에 비교합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.daily.some((item) => item.groupTotal > 0 || item.total > 0) ? (
              <ChartContainer className="h-[300px] w-full aspect-auto" config={GROUP_COMPARE_CONFIG}>
                <LineChart data={data.daily}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={18} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={24} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="groupTotal" stroke="var(--color-groupTotal)" strokeWidth={2.6} dot={false} />
                  <Line type="monotone" dataKey="total" name="myTotal" stroke="var(--color-myTotal)" strokeWidth={3.2} dot={false} />
                </LineChart>
              </ChartContainer>
            ) : (
              <EmptyPanel title="아직 이 모임과 연결된 활동이 없습니다" description="개인 기록을 연결하거나 모임 안에서 직접 기록을 남기면 이 비교선이 살아납니다." />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-[#DDD2C1] bg-white/92 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black">이 모임 안에서의 활동 구성</CardTitle>
            <CardDescription>선택한 모임 안에서 내가 실제로 어떤 종류의 활동을 더 많이 남기는지 보여줍니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {mixData.length > 0 ? (
              <ChartContainer
                className="mx-auto h-[280px] w-full max-w-[360px] aspect-auto"
                config={Object.fromEntries(data.mix.map((item) => [item.key, { label: item.label, color: item.color }]))}
              >
                <PieChart>
                  <Pie data={mixData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={4}>
                    {mixData.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.fill || MIX_COLORS[index % MIX_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent hideIndicator nameKey="name" />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <EmptyPanel title="아직 모임 내 활동 구성이 없습니다" description="선택한 모임 안에서 한 번이라도 기록이 쌓이면 구성이 바로 보입니다." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[32px] border-[#DDD2C1] bg-white/92 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-black">이 모임에서의 최근 기록</CardTitle>
          <CardDescription>음성 기도는 바로 재생할 수 있고, 읽기/QT/말씀저장은 상세 시트로 내려가서 확인할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.recent.length > 0 ? (
            data.recent.map((activity) => <ActivityRow key={activity.id} item={activity} onClick={() => onOpenActivity(activity)} />)
          ) : (
            <EmptyPanel title="아직 이 모임 관련 최근 기록이 없습니다" description="선택한 모임과 연결된 기록이 생기면 이 리스트가 drill-down 출발점이 됩니다." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GroupManageView({
  data,
}: {
  data: Awaited<ReturnType<typeof fetchGroupDashboardData>>;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="활성 멤버" value={`${data.summary.activeContributorCount}명`} note="기간 안에 최소 1회 이상 활동이 잡힌 인원 수" />
        <StatCard label="모임 회원수" value={data.summary.memberCount !== null ? `${data.summary.memberCount}명` : "-"} note="리더 권한으로 볼 수 있는 현재 모임원 수" />
        <StatCard label="가입 대기" value={`${data.summary.pendingCount}명`} note="아직 승인되지 않은 가입 신청 수" />
        <StatCard label="모임 총 활동" value={`${data.summary.groupTotal}`} note="기도, 신앙기록, 교제, 연결 활동을 모두 포함한 총합" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card className="rounded-[32px] border-[#DDD2C1] bg-white/92 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black">이번 기간 가장 활발한 멤버</CardTitle>
            <CardDescription>누가 모임 안에서 기록을 끌어올리고 있는지 바로 보도록 정리했습니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.leaderboard.length > 0 ? (
              data.leaderboard.map((member, index) => (
                <div key={member.userId} className="rounded-[24px] border border-[#E7DDCC] bg-white px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[#F3EEE4] text-[#48624E]">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
                        ) : (
                          <UserRound className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate font-black text-zinc-900">{index + 1}. {member.name}</div>
                          <GroupRolePill role={member.role} />
                        </div>
                        <div className="mt-1 text-sm text-zinc-500">
                          연결 {member.linked} · 기도 {member.prayer} · 신앙기록 {member.faith} · 교제 {member.posts}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-full bg-[#EAF1E4] px-3 py-1 text-sm font-black text-[#48624E]">{member.total}</div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyPanel title="아직 리더보드가 비어 있습니다" description="모임 활동이 쌓이면 여기서 바로 상위 참여 멤버가 보입니다." />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[32px] border-[#DDD2C1] bg-white/92 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-black">최근 쉬고 있는 멤버</CardTitle>
              <CardDescription>이번 기간에 활동이 잡히지 않은 멤버를 빠르게 체크합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.inactiveMembers.length > 0 ? (
                data.inactiveMembers.map((member) => (
                  <div key={member.userId} className="rounded-[22px] bg-[#F7F2E8] px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-black text-zinc-900">{member.name}</div>
                        <div className="mt-1 text-sm text-zinc-500">이번 기간 기록 0건</div>
                      </div>
                      <GroupRolePill role={member.role} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] bg-[#EAF1E4] px-4 py-4 text-sm font-bold text-[#48624E]">이번 기간은 모든 멤버에게 최소 1건 이상의 활동이 있습니다.</div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-[#DDD2C1] bg-white/92 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-black">가입 대기</CardTitle>
              <CardDescription>바로 관리가 필요한 최근 대기 신청입니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.pendingRequests.length > 0 ? (
                data.pendingRequests.map((request) => (
                  <div key={request.id} className="rounded-[22px] bg-[#F7F2E8] px-4 py-4">
                    <div className="font-black text-zinc-900">{request.name}</div>
                    <div className="mt-1 text-sm text-zinc-500">{formatDateTime(request.createdAt)} 신청</div>
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] bg-[#F1F5F9] px-4 py-4 text-sm font-bold text-slate-600">지금은 대기 중인 가입 신청이 없습니다.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function NetworkOverviewView({
  data,
}: {
  data: Awaited<ReturnType<typeof fetchNetworkDashboardData>>;
}) {
  return (
    <div className="space-y-6">
      {data.limitedMessage && (
        <Card className="rounded-[28px] border-[#E4D5C0] bg-[#FFF7EB]">
          <CardContent className="px-5 py-4 text-sm leading-6 text-[#8A5C22]">{data.limitedMessage}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="관리 모임" value={`${data.summary.groupCount}`} note="현재 이 범위에 포함된 전체 모임 수" />
        <StatCard label="전체 멤버" value={`${data.summary.memberCount}`} note="범위 안의 멤버 총합" />
        <StatCard label="총 활동" value={`${data.summary.totalActivities}`} note="기도, 신앙기록, 교제, 연결 활동의 합" />
        <StatCard label="가입 대기" value={`${data.summary.pendingCount}`} note="운영 리소스가 더 필요한 대기 신청 수" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <Card className="rounded-[32px] border-[#DDD2C1] bg-white/92 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black">날짜별 조직 흐름</CardTitle>
            <CardDescription>어떤 종류의 조직 활동이 어느 날짜에 몰렸는지 층으로 분해해 보여줍니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.timeline.some((point) => point.total > 0) ? (
              <ChartContainer className="h-[320px] w-full aspect-auto" config={NETWORK_TIMELINE_CONFIG}>
                <AreaChart data={data.timeline}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={18} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="prayer" stroke="var(--color-prayer)" fill="var(--color-prayer)" fillOpacity={0.22} strokeWidth={2.2} />
                  <Area type="monotone" dataKey="faith" stroke="var(--color-faith)" fill="var(--color-faith)" fillOpacity={0.18} strokeWidth={2.1} />
                  <Area type="monotone" dataKey="posts" stroke="var(--color-posts)" fill="var(--color-posts)" fillOpacity={0.14} strokeWidth={2} />
                  <Area type="monotone" dataKey="linked" stroke="var(--color-linked)" fill="var(--color-linked)" fillOpacity={0.12} strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            ) : (
              <EmptyPanel title="아직 범위 내 활동이 없습니다" description="모임 기록이 쌓이면 여기서 어느 날짜에 어디가 움직였는지 곡선으로 보입니다." />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-[#DDD2C1] bg-white/92 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black">먼저 봐야 할 모임</CardTitle>
            <CardDescription>이번 범위에서 제일 뜨거운 곳, 신호가 꺾인 곳, 대기가 많은 곳을 바로 집어줍니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "가장 뜨거운 모임", value: data.highlights.strongest?.name || "없음", note: data.highlights.strongest ? `${data.highlights.strongest.activityScore}건` : "데이터 없음" },
              { label: "주의가 필요한 모임", value: data.highlights.attention?.name || "없음", note: data.highlights.attention ? `변화 ${data.highlights.attention.trendDelta}` : "데이터 없음" },
              { label: "가입 대기 많은 모임", value: data.highlights.pending?.name || "없음", note: data.highlights.pending ? `${data.highlights.pending.pendingCount}명 대기` : "데이터 없음" },
            ].map((item) => (
              <div key={item.label} className="rounded-[24px] bg-[#F7F2E8] px-4 py-4">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8D7A63]">{item.label}</div>
                <div className="mt-2 text-lg font-black text-zinc-900">{item.value}</div>
                <div className="mt-1 text-sm text-zinc-500">{item.note}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NetworkCompareView({
  data,
  joinedGroupIds,
  onOpenGroup,
}: {
  data: Awaited<ReturnType<typeof fetchNetworkDashboardData>>;
  joinedGroupIds: Set<string>;
  onOpenGroup: (groupId: string) => void;
}) {
  return (
    <div className="space-y-6">
      <SectionHeading
        title="모임별 비교"
        description="활동 점수, 가입 대기, 멤버 수를 한 번에 비교해서 어느 모임부터 drill-down 할지 판단하게 합니다."
      />

      <Card className="rounded-[32px] border-[#DDD2C1] bg-white/92 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-black">활동 점수 비교</CardTitle>
          <CardDescription>기도, 신앙기록, 교제, 연결 활동을 합친 단순 점수입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.groups.length > 0 ? (
            <ChartContainer
              className="h-[360px] w-full aspect-auto"
              config={{ activityScore: { label: "활동 점수", color: "#48624E" } }}
            >
              <BarChart data={data.groups.slice(0, 8)} layout="vertical" margin={{ left: 12, right: 12 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={96} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="activityScore" fill="var(--color-activityScore)" radius={[0, 10, 10, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyPanel title="비교할 모임이 없습니다" description="관리 범위에 모임이 생기면 비교 막대가 바로 만들어집니다." />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {data.groups.map((group) => (
          <button
            key={group.id}
            onClick={() => onOpenGroup(group.id)}
            className="rounded-[28px] border border-[#DDD2C1] bg-white px-5 py-5 text-left transition hover:-translate-y-0.5 hover:border-[#CDBEAA]"
            type="button"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate text-lg font-black text-zinc-900">{group.name}</div>
                  {joinedGroupIds.has(group.id) ? (
                    <span className="rounded-full bg-[#EAF1E4] px-2.5 py-1 text-[11px] font-black text-[#48624E]">내 모임</span>
                  ) : (
                    <span className="rounded-full bg-[#F3EEE4] px-2.5 py-1 text-[11px] font-black text-[#7B6D5C]">범위 보기</span>
                  )}
                </div>
                <div className="mt-2 text-sm text-zinc-500">활동 {group.activityScore} · 멤버 {group.memberCount} · 가입 대기 {group.pendingCount}</div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-zinc-300" />
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {[
                { label: "기도", value: group.prayerCount },
                { label: "신앙", value: group.faithCount },
                { label: "교제", value: group.postCount },
                { label: "연결", value: group.linkedCount },
              ].map((item) => (
                <div key={item.label} className="rounded-[18px] bg-[#F7F2E8] px-3 py-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8D7A63]">{item.label}</div>
                  <div className="mt-2 text-lg font-black text-zinc-900">{item.value}</div>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function InsightsDashboardPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useHashLocation();
  const [selectedActivity, setSelectedActivity] = useState<DashboardActivityItem | null>(null);
  const {
    mobileMenuOpen,
    timeframe,
    contextKind,
    selectedGroupId,
    networkMode,
    activeSubtab,
    setMobileMenuOpen,
    setTimeframe,
    setContext,
    setNetworkMode,
    setActiveSubtab,
  } = useDashboardShellStore();

  const contextsQuery = useQuery({
    queryKey: ["dashboard", "contexts", user?.id],
    queryFn: () => fetchDashboardContexts(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const personalQuery = useQuery({
    queryKey: ["dashboard", "personal-v2", user?.id, timeframe],
    queryFn: () => fetchPersonalDashboardData(user!.id, timeframe),
    enabled: !!user,
    staleTime: 1000 * 60,
  });

  const selectedGroup = useMemo(
    () => contextsQuery.data?.groups.find((group) => group.id === selectedGroupId) ?? null,
    [contextsQuery.data?.groups, selectedGroupId],
  );

  const groupQuery = useQuery({
    queryKey: ["dashboard", "group-v2", user?.id, selectedGroup?.id, selectedGroup?.role, timeframe],
    queryFn: () => fetchGroupDashboardData(user!.id, selectedGroup!, timeframe),
    enabled: !!user && contextKind === "group" && !!selectedGroup,
    staleTime: 1000 * 60,
  });

  const networkQuery = useQuery({
    queryKey: [
      "dashboard",
      "network-v2",
      user?.id,
      networkMode,
      timeframe,
      contextsQuery.data?.managedGroups.map((group) => group.id).join(","),
      contextsQuery.data?.scopeGroups.map((group) => group.id).join(","),
    ],
    queryFn: () =>
      fetchNetworkDashboardData({
        mode: networkMode,
        managedGroupIds: contextsQuery.data?.managedGroups.map((group) => group.id) ?? [],
        scopeGroupIds: contextsQuery.data?.scopeGroups.map((group) => group.id) ?? [],
        days: timeframe,
      }),
    enabled: !!user && contextKind === "network" && !!contextsQuery.data?.summary.hasNetworkAccess,
    staleTime: 1000 * 60,
  });

  const detailQuery = useQuery({
    queryKey: ["dashboard", "activity-detail", selectedActivity?.id, selectedActivity?.sourceTable, selectedActivity?.sourceRowId],
    queryFn: () => fetchDashboardActivityDetail(selectedActivity!),
    enabled: !!selectedActivity,
  });

  useEffect(() => {
    setSelectedActivity(null);
  }, [contextKind, selectedGroupId, timeframe]);

  useEffect(() => {
    const contexts = contextsQuery.data;
    if (!contexts) return;

    if (contextKind === "network" && !contexts.summary.hasNetworkAccess) {
      setContext("personal");
      return;
    }

    if (networkMode === "scope" && !contexts.summary.hasScopeAccess) {
      setNetworkMode("managed");
    }

    if (contextKind === "group") {
      if (!selectedGroupId && contexts.groups[0]) {
        setContext("group", contexts.groups[0].id);
        return;
      }
      if (selectedGroupId && !contexts.groups.some((group) => group.id === selectedGroupId)) {
        setContext(contexts.summary.hasNetworkAccess ? "network" : "personal");
      }
    }
  }, [contextKind, contextsQuery.data, networkMode, selectedGroupId, setContext, setNetworkMode]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#EFE6D7]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#48624E] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#EFE6D7] px-6 py-12">
        <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
          <Card className="w-full rounded-[32px] border-[#DDD2C1] bg-white/95">
            <CardContent className="px-8 py-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#F3EEE4] text-[#48624E]">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h1 className="mt-6 font-['Noto_Serif_KR'] text-3xl font-black text-zinc-900">로그인 후 대시보드를 확인할 수 있습니다</h1>
              <p className="mt-3 text-sm leading-6 text-zinc-500">앱에서 웹 대시보드로 연결되는 화면을 염두에 두고 만든 독립형 페이지라서, 먼저 인증이 필요합니다.</p>
              <div className="mt-7 flex justify-center gap-3">
                <Button onClick={() => setLocation("/auth")} className="rounded-2xl bg-zinc-900 px-5 text-white">로그인</Button>
                <Button variant="outline" onClick={() => setLocation("/")} className="rounded-2xl px-5">홈으로</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const contexts = contextsQuery.data;
  const joinedGroupIds = new Set(contexts?.groups.map((group) => group.id) ?? []);
  const headerInfo = getContextTitle(contextKind, selectedGroup, networkMode);
  const contentLoading =
    contextsQuery.isLoading ||
    (contextKind === "personal" && personalQuery.isLoading) ||
    (contextKind === "group" && groupQuery.isLoading) ||
    (contextKind === "network" && networkQuery.isLoading);

  const openGroupFromNetwork = (groupId: string) => {
    if (joinedGroupIds.has(groupId)) {
      setContext("group", groupId);
      return;
    }
    setLocation(`/group/${groupId}`);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#ECE2D1] text-zinc-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(72,98,78,0.12),_transparent_36%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1700px]">
        <aside className="hidden w-[340px] shrink-0 border-r border-white/40 bg-white/45 px-5 py-6 backdrop-blur-xl lg:block">
          {contexts && (
            <SidebarMenu
              contexts={contexts}
              contextKind={contextKind}
              selectedGroupId={selectedGroupId}
              networkMode={networkMode}
              timeframe={timeframe}
              onContextChange={setContext}
              onNetworkModeChange={setNetworkMode}
              onTimeframeChange={setTimeframe}
            />
          )}
        </aside>

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-[90vw] border-r border-[#E7DDCC] bg-[#F7F1E7] p-0 sm:max-w-sm">
            <SheetHeader className="border-b border-[#E7DDCC] px-5 py-4">
              <SheetTitle className="font-['Noto_Serif_KR'] text-xl font-black">Dashboard Menu</SheetTitle>
            </SheetHeader>
            <div className="p-5">
              {contexts && (
                <SidebarMenu
                  contexts={contexts}
                  contextKind={contextKind}
                  selectedGroupId={selectedGroupId}
                  networkMode={networkMode}
                  timeframe={timeframe}
                  onContextChange={(kind, groupId) => {
                    setContext(kind, groupId);
                    setMobileMenuOpen(false);
                  }}
                  onNetworkModeChange={setNetworkMode}
                  onTimeframeChange={setTimeframe}
                />
              )}
            </div>
          </SheetContent>
        </Sheet>

        <main className="flex-1 px-4 py-4 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-[1240px] space-y-6">
            <header className="overflow-hidden rounded-[34px] border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl">
              <div className="bg-gradient-to-r from-[#48624E] via-[#607965] to-[#B17935] px-5 py-5 text-white lg:px-7 lg:py-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <button
                      onClick={() => setMobileMenuOpen(true)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/14 text-white lg:hidden"
                      type="button"
                    >
                      <Menu className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setLocation("/")}
                      className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-white/14 text-white lg:inline-flex"
                      type="button"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-white/80">
                        {headerInfo.badge}
                      </div>
                      <h1 className="mt-4 font-['Noto_Serif_KR'] text-[2rem] font-black leading-tight lg:text-[2.6rem]">{headerInfo.title}</h1>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-white/80 lg:text-base">{headerInfo.description}</p>
                    </div>
                  </div>

                  <div className="hidden shrink-0 rounded-[28px] bg-white/12 px-4 py-3 text-right lg:block">
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/70">Window</div>
                    <div className="mt-1 text-2xl font-black">{timeframe}일</div>
                    <div className="text-xs text-white/70">{contextKind === "network" ? (networkMode === "scope" ? "상위리더 비교 범위" : "리더 관리 범위") : "개인 / 모임 drill-down"}</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-[#E7DDCC] bg-[#FCFAF5] px-5 py-4 lg:px-7">
                {[
                  { icon: LayoutDashboard, label: "독립 대시보드" },
                  { icon: Users, label: `${contexts?.summary.joinedGroupCount ?? 0}개 모임 연결` },
                  { icon: contextKind === "network" ? Network : Link2, label: contextKind === "group" && selectedGroup ? `${selectedGroup.name} 선택됨` : contextKind === "network" ? "관리 범위 분석" : "개인 활동 분석" },
                ].map((item) => (
                  <div key={item.label} className="inline-flex items-center gap-2 rounded-full bg-[#F3EEE4] px-3 py-1.5 text-xs font-black text-[#6F604E]">
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </div>
                ))}
              </div>
            </header>

            {contentLoading ? (
              <Card className="rounded-[32px] border-[#DDD2C1] bg-white/90">
                <CardContent className="flex min-h-[420px] items-center justify-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#48624E] border-t-transparent" />
                </CardContent>
              </Card>
            ) : contextsQuery.error ? (
              <EmptyPanel
                title="대시보드 컨텍스트를 불러오지 못했습니다"
                description={contextsQuery.error instanceof Error ? contextsQuery.error.message : "모임/권한 정보를 확인하지 못했습니다."}
              />
            ) : contextKind === "personal" && personalQuery.data ? (
              <Tabs value={activeSubtab === "records" ? "records" : "summary"} onValueChange={(value) => setActiveSubtab(value as DashboardSubtab)}>
                <TabsList className="h-auto flex-wrap justify-start rounded-[24px] bg-white/85 p-1.5">
                  <TabsTrigger value="summary" className="rounded-[18px] px-4 py-2.5 text-sm font-black">요약</TabsTrigger>
                  <TabsTrigger value="records" className="rounded-[18px] px-4 py-2.5 text-sm font-black">최근 기록</TabsTrigger>
                </TabsList>
                <TabsContent value="summary" className="mt-6">
                  <PersonalSummaryView data={personalQuery.data} onOpenActivity={setSelectedActivity} />
                </TabsContent>
                <TabsContent value="records" className="mt-6">
                  <PersonalRecordsView data={personalQuery.data} onOpenActivity={setSelectedActivity} />
                </TabsContent>
              </Tabs>
            ) : contextKind === "group" && selectedGroup && groupQuery.data ? (
              <Tabs
                value={
                  activeSubtab === "records"
                    ? "records"
                    : activeSubtab === "manage" && groupQuery.data.canManage
                      ? "manage"
                      : "participation"
                }
                onValueChange={(value) => setActiveSubtab(value as DashboardSubtab)}
              >
                <TabsList className="h-auto flex-wrap justify-start rounded-[24px] bg-white/85 p-1.5">
                  <TabsTrigger value="participation" className="rounded-[18px] px-4 py-2.5 text-sm font-black">내 참여</TabsTrigger>
                  <TabsTrigger value="records" className="rounded-[18px] px-4 py-2.5 text-sm font-black">최근 기록</TabsTrigger>
                  {groupQuery.data.canManage && <TabsTrigger value="manage" className="rounded-[18px] px-4 py-2.5 text-sm font-black">운영 인사이트</TabsTrigger>}
                </TabsList>
                <TabsContent value="participation" className="mt-6">
                  <GroupParticipationView data={groupQuery.data} onOpenActivity={setSelectedActivity} />
                </TabsContent>
                <TabsContent value="records" className="mt-6">
                  <Card className="rounded-[32px] border-[#DDD2C1] bg-white/92 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-xl font-black">선택한 모임과 연결된 내 기록</CardTitle>
                      <CardDescription>여기서 클릭하면 음성은 바로 재생하고, 읽기/QT/말씀은 상세 시트로 drill-down 됩니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {groupQuery.data.recent.length > 0 ? (
                        groupQuery.data.recent.map((activity) => <ActivityRow key={activity.id} item={activity} onClick={() => setSelectedActivity(activity)} />)
                      ) : (
                        <EmptyPanel title="이 모임에 연결된 내 기록이 아직 없습니다" description="개인 기록을 모임에 연결하거나 모임 안에서 직접 남긴 활동이 생기면 이 리스트가 살아납니다." />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                {groupQuery.data.canManage && (
                  <TabsContent value="manage" className="mt-6">
                    <GroupManageView data={groupQuery.data} />
                  </TabsContent>
                )}
              </Tabs>
            ) : contextKind === "network" && networkQuery.data ? (
              <Tabs value={activeSubtab === "compare" ? "compare" : "overview"} onValueChange={(value) => setActiveSubtab(value as DashboardSubtab)}>
                <TabsList className="h-auto flex-wrap justify-start rounded-[24px] bg-white/85 p-1.5">
                  <TabsTrigger value="overview" className="rounded-[18px] px-4 py-2.5 text-sm font-black">개요</TabsTrigger>
                  <TabsTrigger value="compare" className="rounded-[18px] px-4 py-2.5 text-sm font-black">모임 비교</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="mt-6">
                  <NetworkOverviewView data={networkQuery.data} />
                </TabsContent>
                <TabsContent value="compare" className="mt-6">
                  <NetworkCompareView data={networkQuery.data} joinedGroupIds={joinedGroupIds} onOpenGroup={openGroupFromNetwork} />
                </TabsContent>
              </Tabs>
            ) : (
              <EmptyPanel title="대시보드 데이터를 아직 준비하지 못했습니다" description="현재 컨텍스트에 맞는 데이터가 없거나 권한 범위가 비어 있습니다." />
            )}
          </div>
        </main>
      </div>

      <ActivityDetailSheet
        open={!!selectedActivity}
        onOpenChange={(open) => {
          if (!open) setSelectedActivity(null);
        }}
        activity={selectedActivity}
        detail={detailQuery.data}
        loading={detailQuery.isLoading}
      />
    </div>
  );
}
