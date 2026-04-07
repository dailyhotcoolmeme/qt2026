import React, { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { ChevronLeft } from "lucide-react";
import { resolveApiUrl } from "../lib/appUrl";

export default function TermsPage() {
  const [, params] = useRoute("/terms/:type");
  const [term, setTerm] = useState<{ title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!params?.type) return;
    setLoading(true);
    setError(false);
    fetch(resolveApiUrl(`/api/terms?type=${params.type}`))
      .then(async (res) => {
        if (!res.ok) { setError(true); setLoading(false); return; }
        const data = await res.json() as { title: string; content: string };
        if (!data?.title) { setError(true); }
        else { setTerm(data); }
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [params?.type]);

  return (
    <div style={{ minHeight: "100vh", background: "#F8F8F8", display: "flex", flexDirection: "column" }}>
      {/* 헤더 */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "rgba(255,255,255,0.92)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        display: "flex",
        alignItems: "center",
        padding: "0 8px",
        height: "56px",
        paddingTop: "env(safe-area-inset-top, 0px)",
        boxSizing: "border-box",
      }}>
        <button
          onClick={() => window.history.back()}
          style={{
            width: 40, height: 40,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer",
          }}
        >
          <ChevronLeft style={{ width: 24, height: 24, color: "#555" }} />
        </button>
        <span style={{ marginLeft: 4, fontWeight: 700, fontSize: 16, color: "#111", letterSpacing: "-0.3px" }}>
          {term?.title ?? (params?.type === "service" ? "이용약관" : "개인정보처리방침")}
        </span>
      </div>

      {/* 본문 */}
      <div style={{ flex: 1, padding: "24px 20px 80px", maxWidth: 720, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        {loading && (
          <div style={{ textAlign: "center", color: "#aaa", fontSize: 14, paddingTop: 60 }}>
            불러오는 중...
          </div>
        )}
        {!loading && error && (
          <div style={{ textAlign: "center", color: "#aaa", fontSize: 14, paddingTop: 60 }}>
            내용을 불러올 수 없습니다.
          </div>
        )}
        {!loading && !error && term && (
          <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.05)", padding: "28px 24px 32px" }}>
            {/* 타이틀 바 */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 4, height: 22, background: "#4A6741", borderRadius: 3, flexShrink: 0 }} />
              <h1 style={{ fontSize: 19, fontWeight: 800, color: "#1a1a1a", letterSpacing: "-0.5px", margin: 0 }}>
                {term.title}
              </h1>
            </div>
            <div style={{ display: "inline-block", background: "rgba(74,103,65,0.08)", color: "#4A6741", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100, marginBottom: 20 }}>
              아워마인 서비스
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.95, color: "#555", whiteSpace: "pre-wrap", wordBreak: "break-word", letterSpacing: "-0.1px", margin: 0 }}>
              {term.content}
            </p>
          </div>
        )}
        <div style={{ marginTop: 32, textAlign: "center", fontSize: 11, color: "#bbb" }}>
          © 2026 아워마인. All rights reserved.
        </div>
      </div>
    </div>
  );
}
