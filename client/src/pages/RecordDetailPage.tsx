import React, { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { supabase } from "../lib/supabase";
import { formatDateTime } from "./ArchivePage";

export default function RecordDetailPage() {
  const [match, params] = useRoute("/record/:id");
  const [, setLocation] = useLocation();
  const [log, setLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const logId = params?.id;

  useEffect(() => {
    if (!logId) return;
    supabase
      .from("activity_logs")
      .select("*")
      .eq("id", logId)
      .single()
      .then(({ data }) => {
        setLog(data);
        setLoading(false);
      });
  }, [logId]);

  if (loading) return <div className="p-8 text-center">로딩 중...</div>;
  if (!log) return <div className="p-8 text-center">기록을 찾을 수 없습니다.</div>;

  return (
    <div className="min-h-screen bg-[#F8F8F8] pt-20 pb-10 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow p-6">
        <h2 className="font-bold text-lg mb-2">기록 상세</h2>
        <div className="mb-2 text-sm text-zinc-500">{formatDateTime(log.occurred_at)}</div>
        <div className="mb-4">
          <div className="font-bold">종류: {log.activity_type}</div>
          <div>내용: {JSON.stringify(log.payload)}</div>
        </div>
        <button
          className="w-full py-2 mt-4 rounded bg-[#4A6741] text-white font-bold"
          onClick={() => setLocation(getMenuDateUrl(log))}
        >
          해당 기록 화면으로 이동
        </button>
      </div>
    </div>
  );
}

function getMenuDateUrl(log: any) {
  // payload.date가 있으면 우선 사용, 없으면 occurred_at 사용
  const payload = log.payload || {};
  let date = payload.date;
  if (!date) date = log.occurred_at?.slice(0, 10); // YYYY-MM-DD
  if (log.activity_type === "qt") return `/qt?date=${date}`;
  if (log.activity_type === "prayer") return `/prayer?date=${date}`;
  if (log.activity_type === "reading") return `/reading?date=${date}`;
  // bookmark 등 기타는 기본 아카이브로
  return "/archive";
}
