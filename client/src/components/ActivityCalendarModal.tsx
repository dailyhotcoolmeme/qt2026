import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type ActivityCalendarModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  highlightedDateKeys?: Iterable<string>;
  maxDate?: Date;
  title?: string;
};

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function formatLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function ActivityCalendarModal({
  open,
  onOpenChange,
  selectedDate,
  onSelectDate,
  highlightedDateKeys,
  maxDate = new Date(),
  title = "날짜 선택",
}: ActivityCalendarModalProps) {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  useEffect(() => {
    if (!open) return;
    setViewYear(selectedDate.getFullYear());
    setViewMonth(selectedDate.getMonth());
  }, [open, selectedDate]);

  const selectedDateKey = formatLocalDate(selectedDate);
  const maxDateKey = formatLocalDate(maxDate);
  const todayKey = formatLocalDate(new Date());
  const highlightedSet = useMemo(() => new Set(highlightedDateKeys ?? []), [highlightedDateKeys]);

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const firstWeekday = firstDayOfMonth.getDay();
  const maxMonthValue = maxDate.getFullYear() * 12 + maxDate.getMonth();
  const viewMonthValue = viewYear * 12 + viewMonth;
  const canGoNextMonth = viewMonthValue < maxMonthValue;

  const moveMonth = (offset: number) => {
    const next = new Date(viewYear, viewMonth + offset, 1);
    const nextMonthValue = next.getFullYear() * 12 + next.getMonth();
    if (offset > 0 && nextMonthValue > maxMonthValue) return;
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-4"
      onClick={() => onOpenChange(false)}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-700">{title}</h3>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1 text-zinc-500 transition-colors hover:bg-zinc-100"
            aria-label="달력 닫기"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => moveMonth(-1)}
            className="rounded-full p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100"
            aria-label="이전 달"
          >
            <ChevronLeft size={18} />
          </button>
          <p className="text-base font-black text-zinc-900">
            {viewYear}년 {viewMonth + 1}월
          </p>
          <button
            onClick={() => moveMonth(1)}
            disabled={!canGoNextMonth}
            className={`rounded-full p-1.5 transition-colors ${
              canGoNextMonth ? "text-zinc-600 hover:bg-zinc-100" : "cursor-not-allowed text-zinc-300"
            }`}
            aria-label="다음 달"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-y-2 text-center text-xs font-semibold text-zinc-400">
          {WEEKDAY_LABELS.map((weekday) => (
            <div key={weekday}>{weekday}</div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-y-1.5">
          {Array.from({ length: 42 }).map((_, i) => {
            const date = new Date(viewYear, viewMonth, i - firstWeekday + 1);
            const isCurrentMonth = date.getMonth() === viewMonth;
            const dateKey = formatLocalDate(date);
            const isFuture = dateKey > maxDateKey;
            const isSelected = dateKey === selectedDateKey;
            const isToday = dateKey === todayKey;
            const hasActivity = highlightedSet.has(dateKey);

            return (
              <div key={dateKey} className="flex justify-center">
                <button
                  onClick={() => {
                    if (isFuture) return;
                    onSelectDate(date);
                    onOpenChange(false);
                  }}
                  disabled={isFuture}
                  className={`relative h-9 w-9 rounded-full text-sm font-semibold transition-colors ${
                    isSelected
                      ? "bg-[#4A6741] text-white"
                      : isCurrentMonth
                        ? isFuture
                          ? "cursor-not-allowed text-zinc-300"
                          : "text-zinc-700 hover:bg-[#4A6741]/10"
                        : "text-zinc-300"
                  } ${isToday && !isSelected ? "ring-1 ring-[#4A6741]/35" : ""}`}
                >
                  {date.getDate()}
                  {hasActivity && (
                    <span
                      className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                        isSelected ? "bg-white" : "bg-[#4A6741]"
                      }`}
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

