import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useHashLocation } from "wouter/use-hash-location";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  BarChart3,
  BookMarked,
  BookOpen,
  Crown,
  LayoutDashboard,
  Link2,
  Menu,
  Mic,
  Network,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { useAuth } from "../hooks/use-auth";
import {
  fetchDashboardActivityDetail,
  fetchDashboardContexts,
  type DashboardActivityDetail,
  type DashboardActivityItem,
  type DashboardContextKind,
  type DashboardGroupContext,
  type DashboardGroupRole,
} from "../lib/dashboard";
import {
  INSIGHT_PILLAR_META,
  fetchInsightsGroupData,
  fetchInsightsNetworkData,
  fetchInsightsPersonalData,
  type InsightTone,
  type InsightsCareMember,
  type InsightsGroupData,
  type InsightsGroupSignal,
  type InsightsNetworkData,
  type InsightsPillarCard,
  type InsightsPillarKey,
  type InsightsPersonalData,
} from "../lib/insights-dashboard";
import { cn } from "../lib/utils";
import {
  useDashboardShellStore,
  type DashboardSubtab,
} from "../stores/dashboard-shell-store";
import { AudioRecordPlayer } from "../components/AudioRecordPlayer";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../components/ui/chart";
import { ScrollArea } from "../components/ui/scroll-area";
import { Separator } from "../components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

const CORE_CHART_CONFIG = {
  reading: { label: "성경읽기", color: INSIGHT_PILLAR_META.reading.color },
  qt: { label: "QT", color: INSIGHT_PILLAR_META.qt.color },
  prayer: { label: "기도", color: INSIGHT_PILLAR_META.prayer.color },
};

const CONNECTION_CHART_CONFIG = {
  personalOnly: { label: "개인 보관", color: "#D8CDBA" },
  linked: { label: "모임 연결", color: "#48624E" },
  direct: { label: "모임 안 직접 기록", color: "#C47D2C" },
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(value));
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

function toneClasses(tone: InsightTone) {
  if (tone === "warm") {
    return {
      border: "border-[#D5E4D1]",
      background: "bg-[#F2F7EF]",
      chip: "bg-[#E3EFDE] text-[#48624E]",
      label: "함께 이어짐",
    };
  }
  if (tone === "watch") {
    return {
      border: "border-[#EAD7BA]",
      background: "bg-[#FFF7EA]",
      chip: "bg-[#F5E7CC] text-[#A16726]",
      label: "천천히 살핌",
    };
  }
  return {
    border: "border-[#DED7CB]",
    background: "bg-[#F8F4EE]",
    chip: "bg-[#ECE4D8] text-[#7B6D5C]",
    label: "조용한 기간",
  };
}

function getContextTitle(
  kind: DashboardContextKind,
  group?: DashboardGroupContext | null,
  networkMode?: "managed" | "scope",
) {
  if (kind === "personal") {
    return {
      badge: "내 활동",
      title: "내 신앙 리듬",
      description:
        "성경읽기, QT, 기도가 개인 안에서 어떻게 이어지고 있는지, 그리고 어느 모임과 함께 흐르는지 차분히 살핍니다.",
    };
  }
  if (kind === "network") {
    return {
      badge: networkMode === "scope" ? "상위리더 범위" : "리더 범위",
      title:
        networkMode === "scope" ? "상위리더 돌봄 대시보드" : "리더 돌봄 대시보드",
      description:
        networkMode === "scope"
          ? "모임끼리 경쟁시키기보다, 어느 곳에서 읽기·QT·기도가 조용해졌는지와 어디를 먼저 돌보면 좋을지를 봅니다."
          : "내가 맡은 모임들 안에서 읽기·QT·기도가 어떻게 이어지는지, 그리고 어느 모임을 먼저 살피면 좋을지를 봅니다.",
    };
  }
  return {
    badge: group ? roleLabel(group.role) : "모임",
    title: group?.name || "모임 흐름",
    description:
      "이 모임 안에서 내가 남긴 성경읽기, QT, 기도의 흐름을 보고, 리더라면 조용한 시간을 보내는 분들의 안부 신호까지 함께 살핍니다.",
  };
}

function iconForPillar(key: InsightsPillarKey, className = "h-4 w-4") {
  if (key === "reading") return <BookOpen className={className} />;
  if (key === "qt") return <Sparkles className={className} />;
  return <Mic className={className} />;
}

function iconForActivity(type: DashboardActivityItem["type"]) {
  if (type === "reading") return <BookOpen className="h-4 w-4" />;
  if (type === "qt") return <Sparkles className="h-4 w-4" />;
  if (type === "prayer") return <Mic className="h-4 w-4" />;
  return <BookMarked className="h-4 w-4" />;
}

function EmptyPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="rounded-[28px] border-dashed border-[#D5CCBB] bg-white/85 shadow-none">
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
        {description ? (
          <p className="mt-3 pl-4 text-sm leading-6 text-zinc-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function GroupRolePill({ role }: { role: DashboardGroupRole }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-black", roleTone(role))}>
      {roleLabel(role)}
    </span>
  );
}

function LegendRow({
  items,
}: {
  items: Array<{ label: string; color: string }>;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <div key={item.label} className="inline-flex items-center gap-2 text-xs font-bold text-zinc-600">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </div>
      ))}
    </div>
  );
}

function OverviewStory({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <Card className="rounded-[30px] border-[#DDD2C1] bg-white/92 shadow-sm">
      <CardContent className="px-6 py-5">
        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8D7A63]">
          흐름 메모
        </div>
        <div className="mt-3 text-xl font-black text-zinc-900">{title}</div>
        <p className="mt-3 text-sm leading-7 text-zinc-600">{body}</p>
      </CardContent>
    </Card>
  );
}

function PillarCard({
  pillar,
}: {
  pillar: InsightsPillarCard;
}) {
  const color = INSIGHT_PILLAR_META[pillar.key].color;

  return (
    <Card className="overflow-hidden rounded-[30px] border-[#DDD2C1] bg-white/95 shadow-sm">
      <div className="h-1.5" style={{ backgroundColor: color }} />
      <CardContent className="space-y-4 px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3EEE4]" style={{ color }}>
              {iconForPillar(pillar.key, "h-5 w-5")}
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8D7A63]">
                Core Pillar
              </div>
              <div className="mt-1 text-xl font-black text-zinc-900">{pillar.label}</div>
            </div>
          </div>
          <div className="rounded-full bg-[#F4EEE3] px-3 py-1 text-sm font-black text-zinc-800">
            {pillar.total}건
          </div>
        </div>

        <p className="text-sm leading-7 text-zinc-600">{pillar.note}</p>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "활동한 날", value: `${pillar.activeDays}일` },
            {
              label: "마지막 흔적",
              value: pillar.lastActivityAt ? formatDateOnly(pillar.lastActivityAt) : "없음",
            },
            { label: "모임 연결", value: `${pillar.connectedRate}%` },
          ].map((item) => (
            <div key={item.label} className="rounded-[18px] bg-[#F8F3EB] px-3 py-3">
              <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8D7A63]">
                {item.label}
              </div>
              <div className="mt-2 text-base font-black text-zinc-900">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-2 text-xs font-bold text-zinc-500 sm:grid-cols-3">
          <div className="rounded-[16px] bg-[#F8F3EB] px-3 py-2">개인 보관 {pillar.personalOnlyCount}</div>
          <div className="rounded-[16px] bg-[#EDF5E8] px-3 py-2 text-[#48624E]">모임 연결 {pillar.linkedCount}</div>
          <div className="rounded-[16px] bg-[#FFF1DE] px-3 py-2 text-[#A16726]">모임 직접 {pillar.directCount}</div>
        </div>
      </CardContent>
    </Card>
  );
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
        <div className={cn("rounded-2xl p-2.5", active ? "bg-white/15" : "bg-[#F3EEE4] text-[#48624E]")}>
          {icon}
        </div>
        {badge}
      </div>
      <div className="mt-4">
        <div className="font-black">{title}</div>
        <div className={cn("mt-1 text-sm leading-6", active ? "text-white/72" : "text-zinc-500")}>
          {subtitle}
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
        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8D7A63]">
          Insights
        </div>
        <div className="mt-3 font-['Noto_Serif_KR'] text-2xl font-black leading-tight text-zinc-900">
          활동 인사이트
        </div>
        <div className="mt-2 text-sm leading-6 text-zinc-500">
          성경읽기, QT, 기도의 흐름을 개인과 모임 맥락에서 함께 살피는 독립형 대시보드입니다.
        </div>
      </div>

      <div className="rounded-[30px] border border-white/70 bg-white/85 p-3 shadow-sm">
        <div className="px-3 pt-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#8D7A63]">
          Context
        </div>
        <div className="mt-3 space-y-3">
          <ContextButton
            active={contextKind === "personal"}
            icon={<Sparkles className="h-4 w-4" />}
            title="내 활동"
            subtitle="세 축의 개인 흐름과 모임 연결 구조"
            onClick={() => onContextChange("personal")}
          />

          {hasNetwork ? (
            <ContextButton
              active={contextKind === "network"}
              icon={networkMode === "scope" ? <Crown className="h-4 w-4" /> : <Network className="h-4 w-4" />}
              title={networkMode === "scope" ? "상위리더 범위" : "리더 범위"}
              subtitle={
                networkMode === "scope"
                  ? "모임 사이 경쟁이 아니라 돌봄 신호 보기"
                  : "내가 맡은 모임들의 흐름과 안부 신호"
              }
              badge={
                hasScope ? (
                  <div className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-black tracking-[0.16em] text-white">
                    scope
                  </div>
                ) : undefined
              }
              onClick={() => onContextChange("network")}
            />
          ) : null}
        </div>

        {hasNetwork ? (
          <div className="mt-5 px-3">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8D7A63]">
              Range
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => onNetworkModeChange("managed")}
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm font-black transition",
                  networkMode === "managed"
                    ? "bg-[#48624E] text-white"
                    : "bg-[#F3EEE4] text-[#7B6D5C]",
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
                  networkMode === "scope"
                    ? "bg-[#2E4C4C] text-white"
                    : "bg-[#F3EEE4] text-[#7B6D5C]",
                  !hasScope && "cursor-not-allowed opacity-40",
                )}
                type="button"
              >
                상위리더
              </button>
            </div>
          </div>
        ) : null}

        <Separator className="my-5 bg-[#E7DDCC]" />

        <div className="px-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#8D7A63]">
          Groups
        </div>
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
                    <div
                      className={cn(
                        "mt-1 text-xs",
                        contextKind === "group" && selectedGroupId === group.id
                          ? "text-white/70"
                          : "text-zinc-500",
                      )}
                    >
                      이 모임 안에서 남긴 읽기·QT·기도 흐름
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
        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8D7A63]">
          Window
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => onTimeframeChange(days as 7 | 30 | 90)}
              className={cn(
                "rounded-2xl px-3 py-2 text-sm font-black transition",
                timeframe === days
                  ? "bg-zinc-900 text-white"
                  : "bg-[#F3EEE4] text-[#7B6D5C]",
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
                {item.audioUrl ? (
                  <span className="rounded-full bg-[#EAF1E4] px-2 py-0.5 text-[11px] font-bold text-[#48624E]">
                    오디오
                  </span>
                ) : null}
                {item.sourceKind === "group_direct" ? (
                  <span className="rounded-full bg-[#F4EADA] px-2 py-0.5 text-[11px] font-bold text-[#A16726]">
                    모임 안 직접
                  </span>
                ) : null}
                {item.linkedGroups.length > 0 ? (
                  <span className="rounded-full bg-[#E8EEF7] px-2 py-0.5 text-[11px] font-bold text-[#2F5B91]">
                    모임 연결 {item.linkedGroups.length}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 text-sm leading-6 text-zinc-600">{item.summary}</div>
            </div>
            <div className="shrink-0 text-xs font-bold text-zinc-400">
              {formatDateTime(item.occurredAt)}
            </div>
          </div>

          {(item.reference || item.sourceGroupName || item.linkedGroups.length > 0) ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.reference ? (
                <span className="rounded-full bg-[#F5F0E6] px-2.5 py-1 text-[11px] font-bold text-[#7B6D5C]">
                  {item.reference}
                </span>
              ) : null}
              {item.sourceGroupName ? (
                <span className="rounded-full bg-[#EAF1E4] px-2.5 py-1 text-[11px] font-bold text-[#48624E]">
                  {item.sourceGroupName}
                </span>
              ) : null}
              {item.linkedGroups.map((group) => (
                <span
                  key={`${item.id}-${group.id}`}
                  className="rounded-full bg-[#E8EEF7] px-2.5 py-1 text-[11px] font-bold text-[#2F5B91]"
                >
                  {group.name}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function CoreTrendCard({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: InsightsPersonalData["trend"] | InsightsGroupData["groupTimeline"] | InsightsNetworkData["timeline"];
}) {
  return (
    <Card className="rounded-[32px] border-[#DDD2C1] bg-white/92 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-black">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LegendRow
          items={[
            { label: "성경읽기", color: CORE_CHART_CONFIG.reading.color },
            { label: "QT", color: CORE_CHART_CONFIG.qt.color },
            { label: "기도", color: CORE_CHART_CONFIG.prayer.color },
          ]}
        />
        {data.some((point) => point.total > 0) ? (
          <ChartContainer className="h-[320px] w-full aspect-auto" config={CORE_CHART_CONFIG}>
            <AreaChart data={data}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={18} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={28} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="reading"
                stroke="var(--color-reading)"
                fill="var(--color-reading)"
                fillOpacity={0.15}
                strokeWidth={2.6}
              />
              <Area
                type="monotone"
                dataKey="qt"
                stroke="var(--color-qt)"
                fill="var(--color-qt)"
                fillOpacity={0.18}
                strokeWidth={2.6}
              />
              <Area
                type="monotone"
                dataKey="prayer"
                stroke="var(--color-prayer)"
                fill="var(--color-prayer)"
                fillOpacity={0.14}
                strokeWidth={2.6}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <EmptyPanel title="아직 흐름이 보이지 않습니다" description="기록이 쌓이면 어느 날 읽기, QT, 기도가 함께 이어졌는지 이곳에 그려집니다." />
        )}
      </CardContent>
    </Card>
  );
}

function ConnectionBreakdownCard({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: InsightsPersonalData["connectionBreakdown"] | InsightsGroupData["connectionBreakdown"];
}) {
  return (
    <Card className="rounded-[32px] border-[#DDD2C1] bg-white/92 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-black">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LegendRow
          items={[
            { label: "개인 보관", color: CONNECTION_CHART_CONFIG.personalOnly.color },
            { label: "모임 연결", color: CONNECTION_CHART_CONFIG.linked.color },
            { label: "모임 안 직접 기록", color: CONNECTION_CHART_CONFIG.direct.color },
          ]}
        />
        {data.some((point) => point.total > 0) ? (
          <ChartContainer className="h-[320px] w-full aspect-auto" config={CONNECTION_CHART_CONFIG}>
            <BarChart data={data}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={28} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="personalOnly" stackId="a" fill="var(--color-personalOnly)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="linked" stackId="a" fill="var(--color-linked)" />
              <Bar dataKey="direct" stackId="a" fill="var(--color-direct)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ChartContainer>
        ) : (
          <EmptyPanel title="아직 연결 구조가 없습니다" description="개인 기록이나 모임 기록이 쌓이면 세 축별로 어떤 방식으로 이어졌는지 보이게 됩니다." />
        )}
      </CardContent>
    </Card>
  );
}

function GroupShareCard({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: InsightsPersonalData["groupShares"] | InsightsGroupData["groupShares"];
}) {
  return (
    <Card className="rounded-[32px] border-[#DDD2C1] bg-white/92 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-black">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LegendRow
          items={[
            { label: "성경읽기", color: CORE_CHART_CONFIG.reading.color },
            { label: "QT", color: CORE_CHART_CONFIG.qt.color },
            { label: "기도", color: CORE_CHART_CONFIG.prayer.color },
          ]}
        />
        {rows.length > 0 ? (
          <ChartContainer className="h-[360px] w-full aspect-auto" config={CORE_CHART_CONFIG}>
            <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 8 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="groupName" tickLine={false} axisLine={false} width={110} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="reading" stackId="a" fill="var(--color-reading)" radius={[0, 8, 8, 0]} />
              <Bar dataKey="qt" stackId="a" fill="var(--color-qt)" />
              <Bar dataKey="prayer" stackId="a" fill="var(--color-prayer)" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ChartContainer>
        ) : (
          <EmptyPanel title="아직 이어진 모임이 없습니다" description="개인 기록을 모임에 연결하거나 모임 안에서 직접 남긴 기록이 생기면 어떤 모임과 자주 이어지는지 보이게 됩니다." />
        )}
      </CardContent>
    </Card>
  );
}

function ActivityListPanel({
  title,
  description,
  items,
  onOpenActivity,
}: {
  title: string;
  description: string;
  items: DashboardActivityItem[];
  onOpenActivity: (activity: DashboardActivityItem) => void;
}) {
  return (
    <Card className="rounded-[32px] border-[#DDD2C1] bg-white/92 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-black">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 ? (
          items.map((activity) => (
            <ActivityRow key={activity.id} item={activity} onClick={() => onOpenActivity(activity)} />
          ))
        ) : (
          <EmptyPanel title="아직 보여줄 기록이 없습니다" description="이 활동을 시작하면 이곳에서 바로 상세 drill-down 할 수 있게 됩니다." />
        )}
      </CardContent>
    </Card>
  );
}

function PillarDetailPanel({
  pillar,
  items,
  contextCard,
  onOpenActivity,
}: {
  pillar: InsightsPillarCard;
  items: DashboardActivityItem[];
  contextCard?: React.ReactNode;
  onOpenActivity: (activity: DashboardActivityItem) => void;
}) {
  return (
    <div className="space-y-6">
      <SectionHeading
        title={`${pillar.label} 상세 흐름`}
        description={pillar.note}
        action={
          <div className="rounded-full bg-[#F3EEE4] px-3 py-1 text-xs font-black text-[#7B6D5C]">
            {pillar.total}건
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "활동한 날", value: `${pillar.activeDays}일`, note: "이 활동이 실제로 남은 날짜" },
          { label: "이어진 흐름", value: `${pillar.streak}일`, note: "오늘 기준으로 이어진 연속 흐름" },
          {
            label: "마지막 흔적",
            value: pillar.lastActivityAt ? formatDateOnly(pillar.lastActivityAt) : "없음",
            note: "가장 최근에 남긴 기록",
          },
          {
            label: "모임 연결",
            value: `${pillar.connectedRate}%`,
            note: "개인 기록이 모임과 맞물린 비중",
          },
        ].map((item) => (
          <Card key={item.label} className="rounded-[28px] border-[#DDD2C1] bg-white/92 shadow-sm">
            <CardContent className="px-5 py-5">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8D7A63]">
                {item.label}
              </div>
              <div className="mt-3 text-3xl font-black text-zinc-900">{item.value}</div>
              <div className="mt-3 text-sm leading-6 text-zinc-500">{item.note}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {contextCard}

      <ActivityListPanel
        title={`${pillar.label} 최근 기록`}
        description="클릭하면 음성은 바로 재생하고, 읽기/QT/기도 기록은 상세 내용까지 내려가서 봅니다."
        items={items}
        onOpenActivity={onOpenActivity}
      />
    </div>
  );
}

function CareMemberCard({
  member,
}: {
  member: InsightsCareMember;
}) {
  const tone = toneClasses(member.tone);
  return (
    <div className={cn("rounded-[26px] border px-4 py-4", tone.border, tone.background)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white/70 text-[#48624E]">
            {member.avatarUrl ? (
              <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="truncate font-black text-zinc-900">{member.name}</div>
              <GroupRolePill role={member.role} />
            </div>
            <div className="mt-2 text-sm leading-6 text-zinc-600">{member.note}</div>
          </div>
        </div>
        <div className={cn("rounded-full px-3 py-1 text-xs font-black", tone.chip)}>
          {tone.label}
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs font-bold text-zinc-600 sm:grid-cols-4">
        <div className="rounded-[16px] bg-white/70 px-3 py-2">성경읽기 {member.readingCount}</div>
        <div className="rounded-[16px] bg-white/70 px-3 py-2">QT {member.qtCount}</div>
        <div className="rounded-[16px] bg-white/70 px-3 py-2">기도 {member.prayerCount}</div>
        <div className="rounded-[16px] bg-white/70 px-3 py-2">
          {member.lastActivityAt ? `최근 ${formatDateOnly(member.lastActivityAt)}` : `${member.quietDays}일 조용함`}
        </div>
      </div>
    </div>
  );
}

function NetworkGroupCard({
  group,
  canOpenGroup,
  onOpenGroup,
}: {
  group: InsightsGroupSignal;
  canOpenGroup: boolean;
  onOpenGroup: () => void;
}) {
  const tone = toneClasses(group.tone);
  return (
    <Card className={cn("rounded-[30px] border bg-white/92 shadow-sm", tone.border)}>
      <CardContent className="space-y-4 px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="truncate text-lg font-black text-zinc-900">{group.groupName}</div>
              {group.depth > 0 ? (
                <span className="rounded-full bg-[#F3EEE4] px-2.5 py-1 text-[11px] font-black text-[#7B6D5C]">
                  depth {group.depth}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-600">{group.note}</p>
          </div>
          <div className={cn("rounded-full px-3 py-1 text-xs font-black", tone.chip)}>{tone.label}</div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[20px] bg-[#F8F3EB] px-4 py-4">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8D7A63]">
              핵심 활동
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm font-black text-zinc-900">
              <div>읽기 {group.readingCount}</div>
              <div>QT {group.qtCount}</div>
              <div>기도 {group.prayerCount}</div>
            </div>
          </div>
          <div className="rounded-[20px] bg-[#F8F3EB] px-4 py-4">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8D7A63]">
              돌봄 신호
            </div>
            <div className="mt-3 text-sm font-bold leading-6 text-zinc-700">
              최근 함께 기록한 분 {group.activeMemberCount}명 / 조용한 분 {group.quietMemberCount}명 / 가입 대기 {group.pendingCount}명
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-zinc-500">
          <span className="rounded-full bg-[#EDF5E8] px-3 py-1 text-[#48624E]">모임 연결 {group.linkedCount}</span>
          <span className="rounded-full bg-[#FFF1DE] px-3 py-1 text-[#A16726]">모임 안 직접 기록 {group.directCount}</span>
          {group.lastActivityAt ? (
            <span className="rounded-full bg-[#F3EEE4] px-3 py-1">최근 {formatDateOnly(group.lastActivityAt)}</span>
          ) : null}
        </div>

        {canOpenGroup ? (
          <div className="flex justify-end">
            <Button onClick={onOpenGroup} variant="outline" className="rounded-2xl">
              내 모임 컨텍스트 열기
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function buildStoryFromPillars(pillars: InsightsPillarCard[]) {
  const sorted = [...pillars].sort((a, b) => b.total - a.total);
  const strongest = sorted[0];
  const quietest = [...pillars].sort((a, b) => {
    const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
    const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
    return aTime - bTime;
  })[0];

  if (!strongest || strongest.total === 0) {
    return {
      title: "아직 세 축의 첫 흔적을 기다리고 있습니다",
      body: "성경읽기, QT, 기도 중 어느 한 축이라도 시작되면 개인 흐름과 모임 연결 구조가 이곳에서 바로 살아납니다.",
    };
  }

  if (quietest && quietest.total === 0) {
    return {
      title: `${strongest.label} 흐름이 먼저 보입니다`,
      body: `${strongest.label}은 최근까지 이어지고 있고, ${quietest.label}은 아직 흔적이 적어 다음 한 걸음을 부드럽게 시작해 보기 좋습니다.`,
    };
  }

  return {
    title: `${strongest.label}이 가장 또렷하게 보입니다`,
    body: `${strongest.label} 쪽 기록이 가장 먼저 보이고, ${
      quietest.label
    }은 마지막 흔적이 ${
      quietest.lastActivityAt ? formatDateOnly(quietest.lastActivityAt) : "아직 없음"
    }이라 천천히 다시 살피기 좋은 축으로 보입니다.`,
  };
}

function PersonalOverviewView({
  data,
  onOpenActivity,
}: {
  data: InsightsPersonalData;
  onOpenActivity: (activity: DashboardActivityItem) => void;
}) {
  const story = buildStoryFromPillars(data.pillars);
  return (
    <div className="space-y-6">
      <OverviewStory title={story.title} body={story.body} />

      <SectionHeading
        title="세 축의 상태"
        description="성경읽기, QT, 기도가 각각 얼마나 이어지고 있는지, 그리고 모임과 얼마나 맞물리는지를 먼저 봅니다."
      />
      <div className="grid gap-4 xl:grid-cols-3">
        {data.pillars.map((pillar) => (
          <PillarCard key={pillar.key} pillar={pillar} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.95fr]">
        <CoreTrendCard
          title="세 축의 흐름"
          description="어느 날에 성경읽기, QT, 기도가 함께 이어졌는지 날짜 흐름으로 봅니다."
          data={data.trend}
        />
        <ConnectionBreakdownCard
          title="개인 기록과 모임 연결 구조"
          description="세 축 각각이 개인에 머물렀는지, 모임에 연결됐는지, 모임 안에서 직접 남겨졌는지를 나눠 봅니다."
          data={data.connectionBreakdown}
        />
      </div>

      <GroupShareCard
        title="모임별로 이어진 흔적"
        description="개인 활동이 어떤 모임과 자주 맞물렸는지, 그리고 그 모임에서 어떤 축이 더 많이 이어졌는지 보여줍니다."
        rows={data.groupShares}
      />

      <ActivityListPanel
        title="최근 기록"
        description="음성은 바로 재생하고, 텍스트 기록은 상세 내용까지 바로 내려가서 확인할 수 있습니다."
        items={data.recent.slice(0, 8)}
        onOpenActivity={onOpenActivity}
      />
    </div>
  );
}

function GroupOverviewView({
  data,
  onOpenActivity,
}: {
  data: InsightsGroupData;
  onOpenActivity: (activity: DashboardActivityItem) => void;
}) {
  const story = data.groupSignal
    ? { title: data.groupSignal.groupName, body: data.groupSignal.note }
    : buildStoryFromPillars(data.pillars);

  return (
    <div className="space-y-6">
      <OverviewStory title={story.title} body={story.body} />

      {data.groupSignal ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "모임 회원수", value: `${data.groupSignal.memberCount}명`, note: "현재 이 모임에 함께 있는 인원" },
            { label: "최근 함께 기록한 분", value: `${data.groupSignal.activeMemberCount}명`, note: "선택한 기간에 읽기·QT·기도 흔적이 보인 분" },
            { label: "조용한 분", value: `${data.groupSignal.quietMemberCount}명`, note: "선택한 기간에 핵심 활동 흔적이 거의 보이지 않은 분" },
            { label: "가입 대기", value: `${data.groupSignal.pendingCount}명`, note: "함께 맞이할 준비가 필요한 신청" },
          ].map((item) => (
            <Card key={item.label} className="rounded-[28px] border-[#DDD2C1] bg-white/92 shadow-sm">
              <CardContent className="px-5 py-5">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8D7A63]">
                  {item.label}
                </div>
                <div className="mt-3 text-3xl font-black text-zinc-900">{item.value}</div>
                <div className="mt-3 text-sm leading-6 text-zinc-500">{item.note}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <SectionHeading
        title="이 모임 안에서의 내 흐름"
        description="선택한 모임과 맞물린 내 성경읽기, QT, 기도 흐름을 세 축별로 먼저 봅니다."
      />
      <div className="grid gap-4 xl:grid-cols-3">
        {data.pillars.map((pillar) => (
          <PillarCard key={pillar.key} pillar={pillar} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.95fr]">
        <CoreTrendCard
          title="모임 안에서 함께 남겨진 세 축"
          description="이 모임 전체에서 읽기, QT, 기도가 어느 날 함께 이어졌는지 보여줍니다."
          data={data.groupTimeline}
        />
        <ConnectionBreakdownCard
          title="내 기록이 이 모임과 이어진 방식"
          description="내 기록이 개인 보관, 모임 연결, 모임 안 직접 기록 중 어떤 방식으로 남았는지 나눠 봅니다."
          data={data.connectionBreakdown}
        />
      </div>

      <ActivityListPanel
        title="이 모임과 이어진 최근 기록"
        description="이 모임 안에서 남긴 읽기·QT·기도 기록과 연결된 개인 기록을 한 흐름으로 모아 봅니다."
        items={data.recent.slice(0, 8)}
        onOpenActivity={onOpenActivity}
      />
    </div>
  );
}

function GroupCareView({
  data,
}: {
  data: InsightsGroupData;
}) {
  const careFirst = data.careMembers.filter((member) => member.tone !== "warm");
  const steady = data.careMembers.filter((member) => member.tone === "warm");

  return (
    <div className="space-y-6">
      <SectionHeading
        title="안부를 먼저 떠올려 볼 분들"
        description="잘하고 못하고를 가르는 화면이 아니라, 최근 조용했던 분이나 안부를 먼저 나누면 좋을 분들을 살피는 용도입니다."
      />
      <div className="space-y-3">
        {careFirst.length > 0 ? (
          careFirst.map((member) => <CareMemberCard key={member.userId} member={member} />)
        ) : (
          <div className="rounded-[24px] bg-[#EDF5E8] px-4 py-4 text-sm font-bold text-[#48624E]">
            지금은 특별히 먼저 살펴볼 신호가 강한 분이 많지 않습니다.
          </div>
        )}
      </div>

      <SectionHeading
        title="최근 함께 기록을 이어간 분들"
        description="여러 축에서 흔적이 이어지고 있는 분들을 부드럽게 훑어보는 영역입니다."
      />
      <div className="space-y-3">
        {steady.length > 0 ? (
          steady.map((member) => <CareMemberCard key={member.userId} member={member} />)
        ) : (
          <EmptyPanel title="아직 함께 이어진 기록이 많지 않습니다" description="핵심 활동이 쌓이면 이 영역에서 자연스럽게 함께 이어가는 분들의 흐름이 보입니다." />
        )}
      </div>

      <Card className="rounded-[32px] border-[#DDD2C1] bg-white/92 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-black">가입 대기</CardTitle>
          <CardDescription>지금 함께 맞이할 준비가 필요한 신청들입니다.</CardDescription>
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
            <div className="rounded-[22px] bg-[#F1F5F9] px-4 py-4 text-sm font-bold text-slate-600">
              지금은 대기 중인 가입 신청이 없습니다.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NetworkOverviewView({
  data,
}: {
  data: InsightsNetworkData;
}) {
  const strongest = [...data.pillars].sort((a, b) => b.total - a.total)[0];
  const storyTitle =
    strongest && strongest.total > 0
      ? `${strongest.label} 흐름이 가장 먼저 보입니다`
      : "아직 범위 안 핵심 활동이 조용합니다";
  const storyBody =
    strongest && strongest.total > 0
      ? `${strongest.note} 이 화면은 경쟁이나 순위가 아니라, 어느 곳에서 함께 읽고 묵상하고 기도하고 있는지를 부드럽게 살피기 위한 요약입니다.`
      : "최근 기간 안에는 읽기, QT, 기도 흐름이 아직 많지 않아 보입니다. 조용한 모임을 천천히 살펴보는 출발점으로 볼 수 있습니다.";

  return (
    <div className="space-y-6">
      {data.limitedMessage ? <OverviewStory title="데이터 준비 중" body={data.limitedMessage} /> : <OverviewStory title={storyTitle} body={storyBody} />}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "돌보고 있는 모임", value: `${data.summary.groupCount}개`, note: "현재 이 범위에 포함된 모임 수" },
          { label: "함께 기록한 모임원", value: `${data.summary.activeMemberCount}명`, note: "선택한 기간에 읽기·QT·기도 흔적이 보인 분" },
          { label: "조용한 모임원", value: `${data.summary.quietMemberCount}명`, note: "기간 안에 핵심 활동 흔적이 적었던 분" },
          { label: "가입 대기", value: `${data.summary.pendingCount}명`, note: "함께 맞이할 준비가 필요한 신청" },
        ].map((item) => (
          <Card key={item.label} className="rounded-[28px] border-[#DDD2C1] bg-white/92 shadow-sm">
            <CardContent className="px-5 py-5">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8D7A63]">{item.label}</div>
              <div className="mt-3 text-3xl font-black text-zinc-900">{item.value}</div>
              <div className="mt-3 text-sm leading-6 text-zinc-500">{item.note}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {data.pillars.map((pillar) => (
          <Card key={pillar.key} className="rounded-[30px] border-[#DDD2C1] bg-white/92 shadow-sm">
            <CardContent className="space-y-4 px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3EEE4]" style={{ color: INSIGHT_PILLAR_META[pillar.key].color }}>
                  {iconForPillar(pillar.key, "h-5 w-5")}
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8D7A63]">Core Pillar</div>
                  <div className="mt-1 text-xl font-black text-zinc-900">{pillar.label}</div>
                </div>
              </div>
              <div className="text-3xl font-black text-zinc-900">{pillar.total}건</div>
              <div className="text-sm leading-7 text-zinc-600">{pillar.note}</div>
              <div className="grid gap-2 text-xs font-bold text-zinc-500 sm:grid-cols-2">
                <div className="rounded-[16px] bg-[#F8F3EB] px-3 py-2">{pillar.groupCount}개 모임에서 보임</div>
                <div className="rounded-[16px] bg-[#F8F3EB] px-3 py-2">
                  {pillar.lastActivityAt ? `최근 ${formatDateOnly(pillar.lastActivityAt)}` : "최근 기록 없음"}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CoreTrendCard
        title="범위 안에서 함께 남겨진 세 축"
        description="여러 모임을 순위로 세우기보다, 읽기·QT·기도가 어느 날 함께 이어졌는지 전체 흐름을 봅니다."
        data={data.timeline}
      />
    </div>
  );
}

function NetworkGroupsView({
  data,
  joinedGroupIds,
  onOpenGroup,
}: {
  data: InsightsNetworkData;
  joinedGroupIds: Set<string>;
  onOpenGroup: (groupId: string) => void;
}) {
  return (
    <div className="space-y-6">
      <SectionHeading
        title="모임 살펴보기"
        description="모임을 줄 세우기보다, 어디에서 읽기·QT·기도가 이어지고 있고 어디에서 조금 더 안부를 먼저 살피면 좋을지를 보는 카드입니다."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        {data.groups.length > 0 ? (
          data.groups.map((group) => (
            <NetworkGroupCard
              key={group.groupId}
              group={group}
              canOpenGroup={joinedGroupIds.has(group.groupId)}
              onOpenGroup={() => onOpenGroup(group.groupId)}
            />
          ))
        ) : (
          <EmptyPanel title="아직 살펴볼 모임 데이터가 없습니다" description="모임 기록이 쌓이면 이곳에서 모임별로 읽기·QT·기도의 흐름과 돌봄 신호를 함께 볼 수 있습니다." />
        )}
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
      <SheetContent
        side="right"
        className="w-full border-l border-[#E7DDCC] bg-[#F7F1E7] px-0 sm:max-w-[560px]"
      >
        <SheetHeader className="border-b border-[#E7DDCC] px-6 py-5 text-left">
          <SheetTitle className="font-['Noto_Serif_KR'] text-2xl font-black text-zinc-900">
            기록 상세
          </SheetTitle>
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
              <Card className="overflow-hidden rounded-[30px] border-[#DCD0BE] bg-white/95">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-r from-[#48624E] via-[#5F7A64] to-[#B17935] px-6 py-6 text-white">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                        {iconForActivity(activity.type)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-xl font-black">
                          {detail?.title || activity.title}
                        </div>
                        <div className="mt-1 text-sm text-white/75">
                          {detail?.subtitle || formatDateTime(activity.occurredAt)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 px-6 py-6">
                    {(detail?.audioUrl || activity.audioUrl) ? (
                      <div className="rounded-[24px] bg-[#F7F2E8] p-3">
                        <AudioRecordPlayer
                          src={detail?.audioUrl || activity.audioUrl || undefined}
                          title={detail?.title || activity.title}
                          subtitle={detail?.subtitle || formatDateTime(activity.occurredAt)}
                          className="border-none bg-white shadow-none"
                        />
                      </div>
                    ) : null}

                    {(detail?.reference || activity.reference) ? (
                      <div className="rounded-[24px] border border-[#E7DDCC] bg-[#F7F2E8] px-4 py-4">
                        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8D7A63]">
                          Reference
                        </div>
                        <div className="mt-2 text-base font-bold text-zinc-900">
                          {detail?.reference || activity.reference}
                        </div>
                      </div>
                    ) : null}

                    {detail?.body ? (
                      <div className="rounded-[28px] border border-[#E7DDCC] bg-white px-5 py-5">
                        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8D7A63]">
                          Content
                        </div>
                        <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-700">
                          {detail.body}
                        </div>
                      </div>
                    ) : null}

                    {detail?.meta?.length ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {detail.meta.map((item) => (
                          <div key={`${item.label}-${item.value}`} className="rounded-[22px] border border-[#E7DDCC] bg-white px-4 py-4">
                            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8D7A63]">
                              {item.label}
                            </div>
                            <div className="mt-2 text-sm font-bold text-zinc-900">{item.value}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
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
    queryKey: ["insights", "contexts", user?.id],
    queryFn: () => fetchDashboardContexts(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const personalQuery = useQuery({
    queryKey: ["insights", "personal-v3", user?.id, timeframe],
    queryFn: () => fetchInsightsPersonalData(user!.id, timeframe),
    enabled: !!user,
    staleTime: 1000 * 60,
  });

  const selectedGroup = useMemo(
    () => contextsQuery.data?.groups.find((group) => group.id === selectedGroupId) ?? null,
    [contextsQuery.data?.groups, selectedGroupId],
  );

  const groupQuery = useQuery({
    queryKey: ["insights", "group-v3", user?.id, selectedGroup?.id, timeframe],
    queryFn: () => fetchInsightsGroupData(user!.id, selectedGroup!, timeframe),
    enabled: !!user && contextKind === "group" && !!selectedGroup,
    staleTime: 1000 * 60,
  });

  const networkQuery = useQuery({
    queryKey: ["insights", "network-v3", user?.id, networkMode, timeframe],
    queryFn: () => fetchInsightsNetworkData({ mode: networkMode, days: timeframe }),
    enabled: !!user && contextKind === "network" && !!contextsQuery.data?.summary.hasNetworkAccess,
    staleTime: 1000 * 60,
  });

  const detailQuery = useQuery({
    queryKey: [
      "insights",
      "activity-detail",
      selectedActivity?.id,
      selectedActivity?.sourceTable,
      selectedActivity?.sourceRowId,
    ],
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

  const personalPillarMap = useMemo(() => {
    const map = new Map<InsightsPillarKey, InsightsPillarCard>();
    personalQuery.data?.pillars.forEach((pillar) => map.set(pillar.key, pillar));
    return map;
  }, [personalQuery.data?.pillars]);

  const groupPillarMap = useMemo(() => {
    const map = new Map<InsightsPillarKey, InsightsPillarCard>();
    groupQuery.data?.pillars.forEach((pillar) => map.set(pillar.key, pillar));
    return map;
  }, [groupQuery.data?.pillars]);

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
              <h1 className="mt-6 font-['Noto_Serif_KR'] text-3xl font-black text-zinc-900">
                로그인 후 대시보드를 확인할 수 있습니다
              </h1>
              <p className="mt-3 text-sm leading-6 text-zinc-500">
                앱에서 웹 대시보드로 이어지는 화면을 염두에 둔 독립 페이지라서, 먼저 인증이 필요합니다.
              </p>
              <div className="mt-7 flex justify-center gap-3">
                <Button onClick={() => setLocation("/auth")} className="rounded-2xl bg-zinc-900 px-5 text-white">
                  로그인
                </Button>
                <Button variant="outline" onClick={() => setLocation("/")} className="rounded-2xl px-5">
                  홈으로
                </Button>
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
  const personalTabValue =
    activeSubtab === "reading" ||
    activeSubtab === "qt" ||
    activeSubtab === "prayer" ||
    activeSubtab === "recent"
      ? activeSubtab
      : "overview";
  const groupTabValue =
    activeSubtab === "reading" ||
    activeSubtab === "qt" ||
    activeSubtab === "prayer" ||
    activeSubtab === "recent" ||
    (activeSubtab === "care" && groupQuery.data?.canManage)
      ? activeSubtab
      : "overview";

  const contentLoading =
    contextsQuery.isLoading ||
    (contextKind === "personal" && personalQuery.isLoading) ||
    (contextKind === "group" && groupQuery.isLoading) ||
    (contextKind === "network" && networkQuery.isLoading);

  const openGroupFromNetwork = (groupId: string) => {
    if (joinedGroupIds.has(groupId)) {
      setContext("group", groupId);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#ECE2D1] text-zinc-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(72,98,78,0.12),_transparent_36%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1700px]">
        <aside className="hidden w-[340px] shrink-0 border-r border-white/40 bg-white/45 px-5 py-6 backdrop-blur-xl lg:block">
          {contexts ? (
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
          ) : null}
        </aside>

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-[90vw] border-r border-[#E7DDCC] bg-[#F7F1E7] p-0 sm:max-w-sm">
            <SheetHeader className="border-b border-[#E7DDCC] px-5 py-4">
              <SheetTitle className="font-['Noto_Serif_KR'] text-xl font-black">Dashboard Menu</SheetTitle>
            </SheetHeader>
            <div className="p-5">
              {contexts ? (
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
              ) : null}
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
                      <h1 className="mt-4 font-['Noto_Serif_KR'] text-[2rem] font-black leading-tight lg:text-[2.6rem]">
                        {headerInfo.title}
                      </h1>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-white/80 lg:text-base">
                        {headerInfo.description}
                      </p>
                    </div>
                  </div>

                  <div className="hidden shrink-0 rounded-[28px] bg-white/12 px-4 py-3 text-right lg:block">
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/70">
                      Window
                    </div>
                    <div className="mt-1 text-2xl font-black">{timeframe}일</div>
                    <div className="text-xs text-white/70">
                      {contextKind === "network"
                        ? networkMode === "scope"
                          ? "상위리더 돌봄 범위"
                          : "리더 돌봄 범위"
                        : contextKind === "group"
                          ? "모임 안 세 축 흐름"
                          : "개인 세 축 흐름"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-[#E7DDCC] bg-[#FCFAF5] px-5 py-4 lg:px-7">
                {[
                  { icon: LayoutDashboard, label: "성경읽기 / QT / 기도" },
                  { icon: Users, label: `${contexts?.summary.joinedGroupCount ?? 0}개 모임 연결` },
                  {
                    icon: contextKind === "network" ? Network : Link2,
                    label:
                      contextKind === "group" && selectedGroup
                        ? `${selectedGroup.name} 흐름`
                        : contextKind === "network"
                          ? "돌봄 범위 살피기"
                          : "개인 기록 흐름",
                  },
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
                description={
                  contextsQuery.error instanceof Error
                    ? contextsQuery.error.message
                    : "모임/권한 정보를 확인하지 못했습니다."
                }
              />
            ) : contextKind === "personal" && personalQuery.data ? (
              <Tabs value={personalTabValue} onValueChange={(value) => setActiveSubtab(value as DashboardSubtab)}>
                <TabsList className="h-auto flex-wrap justify-start rounded-[24px] bg-white/85 p-1.5">
                  <TabsTrigger value="overview" className="rounded-[18px] px-4 py-2.5 text-sm font-black">한눈에</TabsTrigger>
                  <TabsTrigger value="reading" className="rounded-[18px] px-4 py-2.5 text-sm font-black">성경읽기</TabsTrigger>
                  <TabsTrigger value="qt" className="rounded-[18px] px-4 py-2.5 text-sm font-black">QT</TabsTrigger>
                  <TabsTrigger value="prayer" className="rounded-[18px] px-4 py-2.5 text-sm font-black">기도</TabsTrigger>
                  <TabsTrigger value="recent" className="rounded-[18px] px-4 py-2.5 text-sm font-black">최근 기록</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                  <PersonalOverviewView data={personalQuery.data} onOpenActivity={setSelectedActivity} />
                </TabsContent>
                <TabsContent value="reading" className="mt-6">
                  <PillarDetailPanel
                    pillar={personalPillarMap.get("reading")!}
                    items={personalQuery.data.recent.filter((item) => item.type === "reading")}
                    contextCard={
                      <GroupShareCard
                        title="어느 모임과 읽기가 이어졌는지"
                        description="성경읽기 기록이 어느 모임과 자주 이어졌는지 따로 모아 봅니다."
                        rows={personalQuery.data.groupShares.filter((row) => row.reading > 0)}
                      />
                    }
                    onOpenActivity={setSelectedActivity}
                  />
                </TabsContent>
                <TabsContent value="qt" className="mt-6">
                  <PillarDetailPanel
                    pillar={personalPillarMap.get("qt")!}
                    items={personalQuery.data.recent.filter((item) => item.type === "qt")}
                    contextCard={
                      <GroupShareCard
                        title="어느 모임과 QT가 이어졌는지"
                        description="QT 기록이 어떤 모임과 자주 연결되었는지 따로 모아 봅니다."
                        rows={personalQuery.data.groupShares.filter((row) => row.qt > 0)}
                      />
                    }
                    onOpenActivity={setSelectedActivity}
                  />
                </TabsContent>
                <TabsContent value="prayer" className="mt-6">
                  <PillarDetailPanel
                    pillar={personalPillarMap.get("prayer")!}
                    items={personalQuery.data.recent.filter((item) => item.type === "prayer")}
                    contextCard={
                      <GroupShareCard
                        title="어느 모임과 기도가 이어졌는지"
                        description="개인 기도 기록이 어떤 모임과 자주 이어졌는지 따로 모아 봅니다."
                        rows={personalQuery.data.groupShares.filter((row) => row.prayer > 0)}
                      />
                    }
                    onOpenActivity={setSelectedActivity}
                  />
                </TabsContent>
                <TabsContent value="recent" className="mt-6">
                  <ActivityListPanel
                    title="전체 최근 기록"
                    description="성경읽기, QT, 기도뿐 아니라 말씀 저장까지 최근 흐름을 한 번에 훑어볼 수 있습니다."
                    items={personalQuery.data.recent}
                    onOpenActivity={setSelectedActivity}
                  />
                </TabsContent>
              </Tabs>
            ) : contextKind === "group" && groupQuery.data ? (
              <Tabs value={groupTabValue} onValueChange={(value) => setActiveSubtab(value as DashboardSubtab)}>
                <TabsList className="h-auto flex-wrap justify-start rounded-[24px] bg-white/85 p-1.5">
                  <TabsTrigger value="overview" className="rounded-[18px] px-4 py-2.5 text-sm font-black">한눈에</TabsTrigger>
                  <TabsTrigger value="reading" className="rounded-[18px] px-4 py-2.5 text-sm font-black">성경읽기</TabsTrigger>
                  <TabsTrigger value="qt" className="rounded-[18px] px-4 py-2.5 text-sm font-black">QT</TabsTrigger>
                  <TabsTrigger value="prayer" className="rounded-[18px] px-4 py-2.5 text-sm font-black">기도</TabsTrigger>
                  <TabsTrigger value="recent" className="rounded-[18px] px-4 py-2.5 text-sm font-black">최근 기록</TabsTrigger>
                  {groupQuery.data.canManage ? (
                    <TabsTrigger value="care" className="rounded-[18px] px-4 py-2.5 text-sm font-black">돌봄 신호</TabsTrigger>
                  ) : null}
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                  <GroupOverviewView data={groupQuery.data} onOpenActivity={setSelectedActivity} />
                </TabsContent>
                <TabsContent value="reading" className="mt-6">
                  <PillarDetailPanel
                    pillar={groupPillarMap.get("reading")!}
                    items={groupQuery.data.recent.filter((item) => item.type === "reading")}
                    contextCard={
                      groupQuery.data.groupSignal ? (
                        <Card className="rounded-[30px] border-[#DDD2C1] bg-white/92 shadow-sm">
                          <CardContent className="px-5 py-5">
                            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8D7A63]">
                              모임 안 읽기 흐름
                            </div>
                            <div className="mt-3 text-xl font-black text-zinc-900">
                              최근 {groupQuery.data.groupSignal.readingCount}건
                            </div>
                            <div className="mt-3 text-sm leading-7 text-zinc-600">
                              이 모임 전체에서는 성경읽기 흔적이 {groupQuery.data.groupSignal.readingCount}건 남았고, 최근 기록은 {groupQuery.data.groupSignal.lastReadingAt ? formatDateOnly(groupQuery.data.groupSignal.lastReadingAt) : "아직 없음"}입니다.
                            </div>
                          </CardContent>
                        </Card>
                      ) : undefined
                    }
                    onOpenActivity={setSelectedActivity}
                  />
                </TabsContent>
                <TabsContent value="qt" className="mt-6">
                  <PillarDetailPanel
                    pillar={groupPillarMap.get("qt")!}
                    items={groupQuery.data.recent.filter((item) => item.type === "qt")}
                    contextCard={
                      groupQuery.data.groupSignal ? (
                        <Card className="rounded-[30px] border-[#DDD2C1] bg-white/92 shadow-sm">
                          <CardContent className="px-5 py-5">
                            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8D7A63]">
                              모임 안 QT 흐름
                            </div>
                            <div className="mt-3 text-xl font-black text-zinc-900">
                              최근 {groupQuery.data.groupSignal.qtCount}건
                            </div>
                            <div className="mt-3 text-sm leading-7 text-zinc-600">
                              이 모임 전체에서는 QT 흔적이 {groupQuery.data.groupSignal.qtCount}건 남았고, 최근 기록은 {groupQuery.data.groupSignal.lastQtAt ? formatDateOnly(groupQuery.data.groupSignal.lastQtAt) : "아직 없음"}입니다.
                            </div>
                          </CardContent>
                        </Card>
                      ) : undefined
                    }
                    onOpenActivity={setSelectedActivity}
                  />
                </TabsContent>
                <TabsContent value="prayer" className="mt-6">
                  <PillarDetailPanel
                    pillar={groupPillarMap.get("prayer")!}
                    items={groupQuery.data.recent.filter((item) => item.type === "prayer")}
                    contextCard={
                      groupQuery.data.groupSignal ? (
                        <Card className="rounded-[30px] border-[#DDD2C1] bg-white/92 shadow-sm">
                          <CardContent className="px-5 py-5">
                            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8D7A63]">
                              모임 안 기도 흐름
                            </div>
                            <div className="mt-3 text-xl font-black text-zinc-900">
                              최근 {groupQuery.data.groupSignal.prayerCount}건
                            </div>
                            <div className="mt-3 text-sm leading-7 text-zinc-600">
                              이 모임 전체에서는 기도 흔적이 {groupQuery.data.groupSignal.prayerCount}건 남았고, 최근 기록은 {groupQuery.data.groupSignal.lastPrayerAt ? formatDateOnly(groupQuery.data.groupSignal.lastPrayerAt) : "아직 없음"}입니다.
                            </div>
                          </CardContent>
                        </Card>
                      ) : undefined
                    }
                    onOpenActivity={setSelectedActivity}
                  />
                </TabsContent>
                <TabsContent value="recent" className="mt-6">
                  <ActivityListPanel
                    title="이 모임과 이어진 전체 최근 기록"
                    description="이 모임에 연결된 개인 기록과 모임 안에서 직접 남긴 기록을 함께 훑어봅니다."
                    items={groupQuery.data.recent}
                    onOpenActivity={setSelectedActivity}
                  />
                </TabsContent>
                {groupQuery.data.canManage ? (
                  <TabsContent value="care" className="mt-6">
                    <GroupCareView data={groupQuery.data} />
                  </TabsContent>
                ) : null}
              </Tabs>
            ) : contextKind === "network" && networkQuery.data ? (
              <Tabs value={activeSubtab === "care" ? "care" : "overview"} onValueChange={(value) => setActiveSubtab(value as DashboardSubtab)}>
                <TabsList className="h-auto flex-wrap justify-start rounded-[24px] bg-white/85 p-1.5">
                  <TabsTrigger value="overview" className="rounded-[18px] px-4 py-2.5 text-sm font-black">한눈에</TabsTrigger>
                  <TabsTrigger value="care" className="rounded-[18px] px-4 py-2.5 text-sm font-black">모임 살펴보기</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="mt-6">
                  <NetworkOverviewView data={networkQuery.data} />
                </TabsContent>
                <TabsContent value="care" className="mt-6">
                  <NetworkGroupsView data={networkQuery.data} joinedGroupIds={joinedGroupIds} onOpenGroup={openGroupFromNetwork} />
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
