import { useEffect, useState } from "react"; // 에러 해결을 위한 핵심 선언
import { supabase } from "../lib/supabase"; // 파일명에 맞춰 경로 수정
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import AuthPage from "./AuthPage"; 
import { 
  Trophy, BookOpen, MessageCircle, 
  ChevronLeft, Settings, Star, LogOut, UserMinus, ChevronRight, UserCircle,
  Copy, Share2
} from "lucide-react";

// --- 상세 페이지 컴포넌트 ---

const SharingCard = ({ item, type }: { item: any, type: 'word' | 'meditation' }) => (
  <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm space-y-4 w-full text-left">
    <div className="flex justify-between items-center">
      <span className="text-[11px] font-bold text-gray-300">
        {new Date(item.created_at).toLocaleDateString()}
      </span>
      <span className={`${type === 'word' ? 'text-primary' : 'text-[#7180B9]'} font-black text-[14px]`}>
        {item.verse}
      </span>
    </div>
    
    <div className="relative w-full">
      <div className="p-5 bg-gray-50/50 rounded-2xl border border-gray-100 h-32 overflow-y-auto custom-scrollbar w-full">
        <p className="text-[14px] text-gray-600 leading-relaxed font-medium pr-2">
          {item.content}
        </p>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full text-gray-300"><Star className="w-4 h-4" /></Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full text-gray-300"><Copy className="w-4 h-4" /></Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full text-gray-300"><Share2 className="w-4 h-4" /></Button>
      </div>
    </div>

    <div className="space-y-4 pt-1 w-full">
      <div className="space-y-1">
        <p className="text-[11px] font-black text-gray-400 uppercase tracking-tighter">
          {type === 'word' ? '나의 나눔' : '묵상 기록'}
        </p>
        <p className="text-[15px] text-gray-800 font-medium leading-relaxed">
          {type === 'word' ? item.my_text : item.my_meditation}
        </p>
      </div>
      {item.my_prayer && (
        <div className="pt-4 border-t border-gray-50 space-y-1">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-tighter">묵상 기도</p>
          <p className="text-[15px] text-[#7180B9] font-medium leading-relaxed">{item.my_prayer}</p>
        </div>
      )}
    </div>
  </div>
);

// --- 메인 아카이브 페이지 ---

export default function ArchivePage() {
  const [session, setSession] = useState<any>(null);
  const [currentView, setCurrentView] = useState<string>("menu");
  const [loading, setLoading] = useState(true);
  
  // 실제 DB 데이터를 담을 공간
  const [meditationRecords, setMeditationRecords] = useState<any[]>([]);
  const [userData, setUserData] = useState({ 
    id: "", name: "", title: "", nickname: "", church: "", rank: "신실한 동반자" 
  });

  useEffect(() => {
    async function loadAllData() {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);

      if (currentSession?.user) {
        // 1. 프로필 불러오기
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentSession.user.id).single();
        if (profile) setUserData(profile);

        // 2. meditations 테이블에서 내 묵상 기록만 가져오기
        const { data: meditations } = await supabase
          .from('meditations')
          .select('*')
          .eq('user_id', currentSession.user.id)
          .order('created_at', { ascending: false });
        
        if (meditations) setMeditationRecords(meditations);
      }
      setLoading(false);
    }
    loadAllData();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-primary italic">기록을 불러오는 중...</div>;
  if (!session) return <AuthPage />;

  // 화면 전환 로직
  if (currentView === "meditationLog") return (
    <div className="flex flex-col h-full bg-gray-50/50 w-full overflow-hidden">
      <header className="p-4 bg-white border-b flex items-center gap-4 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => setCurrentView("menu")}><ChevronLeft className="w-6 h-6" /></Button>
        <h2 className="font-black text-lg text-gray-900">오늘의 묵상 나눔 기록</h2>
      </header>
      <div className="flex-1 p-5 space-y-4 overflow-y-auto w-full pb-10">
        {meditationRecords.length > 0 ? (
          meditationRecords.map((m) => <SharingCard key={m.id} item={m} type="meditation" />)
        ) : (
          <div className="text-center py-20 text-gray-400 font-bold">아직 작성된 묵상이 없습니다.</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-x-hidden w-full">
      <header className="flex-none pt-12 pb-8 bg-white w-full border-b border-gray-100">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 bg-[#7180B9]/10 rounded-[32px] flex items-center justify-center text-[#7180B9]"><Trophy className="w-10 h-10" /></div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-gray-900">{userData.name || "성도"} {userData.title || ""}</h2>
            <p className="text-[13px] font-bold text-[#7180B9]">{userData.rank}</p>
            <p className="text-[11px] font-bold text-gray-300">{userData.church || "섬기는 교회 정보 없음"}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-4 w-full bg-gray-50/30 pb-32">
        <MenuButton icon={<UserCircle className="w-5 h-5 text-gray-400" />} label="프로필 수정" onClick={() => {}} />
        <MenuButton icon={<MessageCircle className="w-5 h-5 text-primary" />} label="오늘의 말씀 나눔 기록" onClick={() => {}} />
        <MenuButton icon={<BookOpen className="w-5 h-5 text-[#7180B9]" />} label="오늘의 묵상 나눔 기록" onClick={() => setCurrentView("meditationLog")} />
        
        <div className="grid grid-cols-2 gap-3 w-full mt-6">
          <Button onClick={async () => await supabase.auth.signOut()} variant="ghost" className="h-14 bg-white rounded-2xl border border-gray-100 text-gray-500 font-black"><LogOut className="w-4 h-4 mr-2" /> 로그아웃</Button>
          <Button variant="ghost" className="h-14 bg-white rounded-2xl border border-gray-100 text-red-400 font-black"><UserMinus className="w-4 h-4 mr-2" /> 회원탈퇴</Button>
        </div>
      </main>
    </div>
  );
}

function MenuButton({ icon, label, onClick }: any) {
  return (
    <Button onClick={onClick} className="w-full h-[72px] justify-between px-6 bg-white hover:bg-white rounded-2xl border border-gray-100 text-gray-800 shadow-sm active:scale-[0.98] transition-all">
      <div className="flex items-center gap-4">{icon}<span className="font-black text-[15px]">{label}</span></div>
      <ChevronRight className="w-5 h-5 text-gray-200" />
    </Button>
  );
}
