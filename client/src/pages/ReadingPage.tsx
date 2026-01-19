import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { 
  Play, Pause, Square, CheckCircle2, BarChart3, X, Trophy, Volume2,
  ChevronLeft, ChevronRight, Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AuthPage from "./AuthPage"; 
import { useDisplaySettings } from "../components/DisplaySettingsProvider";

// --- 성경 데이터 (전체 데이터 복구) ---
const BIBLE_BOOKS = [
  { name: "창세기", chapters: 50, type: "구약" }, { name: "출애굽기", chapters: 40, type: "구약" },
  { name: "레위기", chapters: 27, type: "구약" }, { name: "민수기", chapters: 36, type: "구약" },
  { name: "신명기", chapters: 34, type: "구약" }, { name: "여호수아", chapters: 24, type: "구약" },
  { name: "사사기", chapters: 21, type: "구약" }, { name: "루기", chapters: 4, type: "구약" },
  { name: "사무엘상", chapters: 31, type: "구약" }, { name: "사무엘하", chapters: 24, type: "구약" },
  { name: "열왕기상", chapters: 22, type: "구약" }, { name: "열왕기하", chapters: 25, type: "구약" },
  { name: "역대상", chapters: 29, type: "구약" }, { name: "역대하", chapters: 36, type: "구약" },
  { name: "에스라", chapters: 10, type: "구약" }, { name: "느헤미야", chapters: 13, type: "구약" },
  { name: "에스더", chapters: 10, type: "구약" }, { name: "욥기", chapters: 42, type: "구약" },
  { name: "시편", chapters: 150, type: "구약" }, { name: "잠언", chapters: 31, type: "구약" },
  { name: "전도서", chapters: 12, type: "구약" }, { name: "아가", chapters: 8, type: "구약" },
  { name: "이사야", chapters: 66, type: "구약" }, { name: "예레미야", chapters: 52, type: "구약" },
  { name: "예레미야 애가", chapters: 5, type: "구약" }, { name: "에스겔", chapters: 48, type: "구약" },
  { name: "다니엘", chapters: 12, type: "구약" }, { name: "호세아", chapters: 14, type: "구약" },
  { name: "요엘", chapters: 3, type: "구약" }, { name: "아모스", chapters: 9, type: "구약" },
  { name: "오바댜", chapters: 1, type: "구약" }, { name: "요나", chapters: 4, type: "구약" },
  { name: "미가", chapters: 7, type: "구약" }, { name: "나훔", chapters: 3, type: "구약" },
  { name: "하박국", chapters: 3, type: "구약" }, { name: "스바냐", chapters: 3, type: "구약" },
  { name: "학개", chapters: 2, type: "구약" }, { name: "스가랴", chapters: 14, type: "구약" },
  { name: "말라기", chapters: 4, type: "구약" },
  { name: "마태복음", chapters: 28, type: "신약" }, { name: "마가복음", chapters: 16, type: "신약" },
  { name: "누가복음", chapters: 24, type: "신약" }, { name: "요한복음", chapters: 21, type: "신약" },
  { name: "사도행전", chapters: 28, type: "신약" }, { name: "로마서", chapters: 16, type: "신약" },
  { name: "고린도전서", chapters: 16, type: "신약" }, { name: "고린도후서", chapters: 13, type: "신약" },
  { name: "갈라디아서", chapters: 6, type: "신약" }, { name: "에베소서", chapters: 6, type: "신약" },
  { name: "빌립보서", chapters: 4, type: "신약" }, { name: "골로새서", chapters: 4, type: "신약" },
  { name: "데살로니가전서", chapters: 5, type: "신약" }, { name: "데살로니가후서", chapters: 3, type: "신약" },
  { name: "디모데전서", chapters: 6, type: "신약" }, { name: "디모데후서", chapters: 4, type: "신약" },
  { name: "디도서", chapters: 3, type: "신약" }, { name: "빌레몬서", chapters: 1, type: "신약" },
  { name: "히브리서", chapters: 13, type: "신약" }, { name: "야고보서", chapters: 5, type: "신약" },
  { name: "베드로전서", chapters: 5, type: "신약" }, { name: "베드로후서", chapters: 3, type: "신약" },
  { name: "요한1서", chapters: 5, type: "신약" }, { name: "요한2서", chapters: 1, type: "신약" },
  { name: "요한3서", chapters: 1, type: "신약" }, { name: "유다서", chapters: 1, type: "신약" },
  { name: "요한계시록", chapters: 22, type: "신약" }
];

export default function ReadingPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const { fontSize } = useDisplaySettings();
  const [showDetail, setShowDetail] = useState(false);
  const [detailTab, setDetailTab] = useState<'구약' | '신약'>('구약');

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden pt-[64px]">
      
      {/* 헤더: DailyWordPage 스타일 일치 */}
      <header className="flex-none w-full bg-white border-b border-gray-50 z-[100] shadow-sm">
        <div className="flex items-center justify-between py-3 px-4 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => {
            const d = new Date(currentDate); d.setDate(d.getDate()-1); setCurrentDate(d);
          }}><ChevronLeft className="w-6 h-6" /></Button>
          <div className="text-center">
            <h1 className="text-[#5D7BAF] font-bold text-center" style={{ fontSize: `${fontSize + 3}px` }}>성경 통독</h1>
            <p className="text-sm text-gray-400 font-bold text-center">
              {currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              {` (${currentDate.toLocaleDateString('ko-KR', {weekday: 'short'})})`}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => {
            const d = new Date(currentDate); d.setDate(d.getDate() + 1);
            if (d <= today) setCurrentDate(d);
          }}><ChevronRight className="w-6 h-6" /></Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pt-4 px-4 pb-24 space-y-4">
        {/* 대시보드: rounded-sm */}
        <Card className="border-none bg-[#5D7BAF] shadow-none overflow-hidden rounded-sm">
          <CardContent className="pt-8 pb-8 px-6 text-white text-center space-y-3">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">오늘도 말씀으로 승리!</h2>
              <p className="text-sm opacity-80 mt-1">전체 성경의 12.5%를 읽으셨습니다.</p>
            </div>
            <div className="w-full bg-white/20 h-1.5 rounded-full mt-4">
              <div className="bg-white h-full rounded-full" style={{ width: '12.5%' }} />
            </div>
          </CardContent>
        </Card>

        {/* 메인 버튼: rounded-sm */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            onClick={() => setShowDetail(true)}
            className="h-28 flex flex-col gap-2 border-gray-100 rounded-sm hover:bg-gray-50 bg-white"
          >
            <BarChart3 className="w-7 h-7 text-[#5D7BAF]" />
            <span className="font-bold text-gray-600">통독 상세 현황</span>
          </Button>
          <Button 
            className="h-28 flex flex-col gap-2 bg-[#5D7BAF] hover:bg-[#4a638c] text-white rounded-sm"
          >
            <CheckCircle2 className="w-7 h-7" />
            <span className="font-bold">오늘 읽기 완료</span>
          </Button>
        </div>

        {/* 최근 기록 리스트 */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center gap-2 px-1">
            <Volume2 className="w-5 h-5 text-[#5D7BAF]" />
            <h3 className="font-bold text-[#5D7BAF]" style={{ fontSize: `${fontSize + 1}px` }}>최근 통독 기록</h3>
          </div>
          
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between p-5 bg-white rounded-sm border border-gray-100 shadow-sm">
              <div className="space-y-1">
                <p className="font-bold text-gray-800" style={{ fontSize: `${fontSize}px` }}>
                  {i === 1 ? "출애굽기 15장 - 18장" : "출애굽기 11장 - 14장"}
                </p>
                <p className="text-[11px] text-gray-400 font-bold">2026.01.{18-i}</p>
              </div>
              <Check className="w-5 h-5 text-green-500" />
            </div>
          ))}
        </div>
      </main>

      {/* 상세 진척도 모달 (모든 데이터 포함) */}
      <AnimatePresence>
        {showDetail && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: "100%" }}
            className="fixed inset-0 z-[200] bg-white flex flex-col"
          >
            <header className="p-4 border-b flex items-center justify-between mt-8">
              <h2 className="font-bold text-lg text-gray-800 ml-2">통독 상세 현황</h2>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowDetail(false)}>
                <X className="w-6 h-6 text-gray-400" />
              </Button>
            </header>

            <div className="p-4">
              <div className="flex bg-gray-100 p-1 rounded-sm">
                <button 
                  className={`flex-1 py-2.5 text-sm font-bold rounded-sm transition-all ${detailTab === '구약' ? 'bg-white text-[#5D7BAF] shadow-sm' : 'text-gray-400'}`}
                  onClick={() => setDetailTab('구약')}
                >구약</button>
                <button 
                  className={`flex-1 py-2.5 text-sm font-bold rounded-sm transition-all ${detailTab === '신약' ? 'bg-white text-[#5D7BAF] shadow-sm' : 'text-gray-400'}`}
                  onClick={() => setDetailTab('신약')}
                >신약</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-5">
              {BIBLE_BOOKS.filter(b => b.type === detailTab).map(book => (
                <div key={book.name} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="font-bold text-gray-700" style={{ fontSize: `${fontSize - 1}px` }}>{book.name}</span>
                    <span className="text-[11px] font-bold text-[#5D7BAF]">0 / {book.chapters} 장</span>
                  </div>
                  <div className="h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                    <div className="h-full bg-[#5D7BAF]/30 rounded-full" style={{ width: '0%' }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
