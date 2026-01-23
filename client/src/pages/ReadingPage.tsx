import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/button";
import { Book, Save, Trophy, CheckCircle2, ChevronRight, X, ChevronLeft } from "lucide-react";

// 사용자님이 고생하며 정리하신 성경 66권 데이터 복구
const BIBLE_BOOKS = {
  구약: [
    { name: "창세기", chapters: 50 }, { name: "출애굽기", chapters: 40 }, { name: "레위기", chapters: 27 },
    { name: "민수기", chapters: 36 }, { name: "신명기", chapters: 34 }, { name: "여호수아", chapters: 24 },
    { name: "사사기", chapters: 21 }, { name: "루기", chapters: 4 }, { name: "사무엘상", chapters: 31 },
    { name: "사무엘하", chapters: 24 }, { name: "열왕기상", chapters: 22 }, { name: "열왕기하", chapters: 25 },
    { name: "역대상", chapters: 29 }, { name: "역대하", chapters: 36 }, { name: "에스라", chapters: 10 },
    { name: "느헤미야", chapters: 13 }, { name: "에스더", chapters: 10 }, { name: "욥기", chapters: 42 },
    { name: "시편", chapters: 150 }, { name: "잠언", chapters: 31 }, { name: "전도서", chapters: 12 },
    { name: "아가", chapters: 8 }, { name: "이사야", chapters: 66 }, { name: "예레미야", chapters: 52 },
    { name: "예레미야 애가", chapters: 5 }, { name: "에스겔", chapters: 48 }, { name: "단이엘", chapters: 12 },
    { name: "호세아", chapters: 14 }, { name: "요엘", chapters: 3 }, { name: "아모스", chapters: 9 },
    { name: "오바댜", chapters: 1 }, { name: "요나", chapters: 4 }, { name: "미가", chapters: 7 },
    { name: "나훔", chapters: 3 }, { name: "하박국", chapters: 3 }, { name: "스바냐", chapters: 3 },
    { name: "학개", chapters: 2 }, { name: "스가랴", chapters: 14 }, { name: "말라기", chapters: 4 }
  ],
  신약: [
    { name: "마태복음", chapters: 28 }, { name: "마가복음", chapters: 16 }, { name: "누가복음", chapters: 24 },
    { name: "요한복음", chapters: 21 }, { name: "사도행전", chapters: 28 }, { name: "로마서", chapters: 16 },
    { name: "고린도전서", chapters: 16 }, { name: "고린도후서", chapters: 13 }, { name: "갈라디아서", chapters: 6 },
    { name: "에베소서", chapters: 6 }, { name: "빌립보서", chapters: 4 }, { name: "골로새서", chapters: 4 },
    { name: "데살로니가전서", chapters: 5 }, { name: "데살로니가후서", chapters: 3 }, { name: "디모데전서", chapters: 6 },
    { name: "디모데후서", chapters: 4 }, { name: "디도서", chapters: 3 }, { name: "빌레몬서", chapters: 1 },
    { name: "히브리서", chapters: 13 }, { name: "야고보서", chapters: 5 }, { name: "베드로전서", chapters: 5 },
    { name: "베드로후서", chapters: 3 }, { name: "요한1서", chapters: 5 }, { name: "요한2서", chapters: 1 },
    { name: "요한3서", chapters: 1 }, { name: "유다서", chapters: 1 }, { name: "요한계시록", chapters: 22 }
  ]
};

export default function ReadingPage() {
  // 상태 관리
  const [showSelector, setShowSelector] = useState(false);
  const [selectorStep, setSelectorStep] = useState<"book" | "chapter">("book");
  const [selectedBook, setSelectedBook] = useState<{name: string, chapters: number} | null>(null);
  const [tab, setTab] = useState<"구약" | "신약">("구약");
  
  const [verses, setVerses] = useState<any[]>([]);
  const [readVerses, setReadVerses] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [memo, setMemo] = useState("");
  const [currentSelection, setCurrentSelection] = useState({ book: "창세기", chapter: 1 });

  const fetchVerses = async (book: string, chapter: number) => {
    setLoading(true);
    const { data } = await supabase.from("bible_verses").select("*").eq("book_name", book).eq("chapter", chapter).order("verse", { ascending: true });
    if (data) setVerses(data);
    setReadVerses([]); 
    setLoading(false);
  };

  useEffect(() => { fetchVerses(currentSelection.book, currentSelection.chapter); }, []);

  const progress = verses.length > 0 ? Math.round((readVerses.length / verses.length) * 100) : 0;

  const handleSaveMemo = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert("로그인 후 이용 가능합니다.");
    const { error } = await supabase.from("notes").insert({
      user_id: session.user.id,
      content: memo,
      reference: `${currentSelection.book} ${currentSelection.chapter}장`,
    });
    if (!error) alert("묵상이 저장되었습니다.");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-white relative">
      {/* 1. 상단: 책/장 선택 및 진척도 */}
      <div className="p-5 border-b bg-white z-20 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => { setShowSelector(true); setSelectorStep("book"); }} className="flex items-center gap-1 group">
            <h2 className="text-2xl font-black text-gray-900 group-active:text-[#7180B9]">
              {currentSelection.book} {currentSelection.chapter}장
            </h2>
            <ChevronRight className="w-6 h-6 text-gray-400" />
          </button>
          <div className="text-right">
            <div className="text-xs font-black text-[#7180B9] mb-1">{progress}% 달성</div>
            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#7180B9] transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 2. 본문 섹션 */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-20">
        {loading ? (
          <div className="text-center pt-20 text-gray-400 font-bold">말씀을 불러오는 중...</div>
        ) : (
          verses.map((v) => (
            <div key={v.id} onClick={() => setReadVerses(prev => prev.includes(v.verse) ? prev.filter(n => n !== v.verse) : [...prev, v.verse])}
              className={`flex gap-4 items-start cursor-pointer transition-all ${readVerses.includes(v.verse) ? 'opacity-30 scale-95' : 'opacity-100'}`}>
              <div className="pt-1">
                {readVerses.includes(v.verse) ? <CheckCircle2 className="w-5 h-5 text-[#7180B9]" /> : <div className="w-5 h-5 border-2 border-gray-200 rounded-full" />}
              </div>
              <p className="text-[1.1rem] font-medium leading-[1.7] text-gray-800 tracking-tight">
                <span className="text-[#7180B9] font-bold mr-2 text-sm">{v.verse}</span>
                {v.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* 3. 하단: 메모장 섹션 */}
      <div className="p-4 bg-gray-50 border-t z-20">
        <div className="flex justify-between items-center mb-2 px-1">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Today's Note</span>
          <button onClick={handleSaveMemo} className="text-[#7180B9] font-black text-sm flex items-center gap-1">
            <Save className="w-4 h-4" /> 저장
          </button>
        </div>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="말씀을 통해 깨달은 은혜를 적어보세요..."
          className="w-full h-24 p-4 bg-white border-none rounded-2xl shadow-sm outline-none text-sm resize-none"
        />
      </div>

      {/* 4. 성경 선택 모달 (구/신약 탭 + 장 선택 전체 복구) */}
      {showSelector && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end">
          <div className="w-full h-[85vh] bg-white rounded-t-[32px] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center bg-white">
              <div className="flex items-center gap-2">
                {selectorStep === "chapter" && <button onClick={() => setSelectorStep("book")} className="p-2"><ChevronLeft/></button>}
                <h3 className="text-xl font-black">{selectorStep === "book" ? "성경 선택" : `${selectedBook?.name} - 장 선택`}</h3>
              </div>
              <button onClick={() => setShowSelector(false)} className="p-2 bg-gray-100 rounded-full"><X className="w-5 h-5"/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
              {selectorStep === "book" ? (
                <>
                  <div className="flex gap-2 mb-6">
                    {(["구약", "신약"] as const).map(t => (
                      <button key={t} onClick={() => setTab(t)} className={`flex-1 h-14 rounded-2xl font-black transition-all ${tab === t ? "bg-[#7180B9] text-white shadow-lg" : "bg-white text-gray-400 border border-gray-100"}`}>{t}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {BIBLE_BOOKS[tab].map(book => (
                      <button key={book.name} onClick={() => { setSelectedBook(book); setSelectorStep("chapter"); }}
                        className="h-14 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 active:bg-[#7180B9] active:text-white transition-all">{book.name}</button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-5 gap-3">
                  {Array.from({ length: selectedBook?.chapters || 0 }, (_, i) => i + 1).map(num => (
                    <button key={num} onClick={() => { setCurrentSelection({ book: selectedBook!.name, chapter: num }); fetchVerses(selectedBook!.name, num); setShowSelector(false); }}
                      className="h-14 bg-white border border-gray-100 rounded-2xl font-black text-gray-700 active:bg-[#7180B9] active:text-white transition-all">{num}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
