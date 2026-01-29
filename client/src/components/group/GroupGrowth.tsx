import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, Mic, Calendar as CalIcon, BarChart3, 
  Quote, Flame, Trophy, ChevronRight, Play, RotateCcw, X, BookOpen, Users, CheckCircle, Sparkles
} from "lucide-react";

export default function GroupGrowth({ groupId, role }: any) {
  const [checked, setChecked] = useState<string[]>([]);
  const [activeRecording, setActiveRecording] = useState<string | null>(null);
  const [showBibleReader, setShowBibleReader] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ✅ [무설치 폭죽 로직] 
  const triggerConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles: any[] = [];
    const colors = ["#4A6741", "#A2C098", "#FFD700", "#FFFFFF"];
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: canvas.width / 2, y: canvas.height * 0.6,
        radius: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        velocity: { x: (Math.random() - 0.5) * 15, y: (Math.random() - 0.7) * 20 },
        opacity: 1
      });
    }
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, i) => {
        p.velocity.y += 0.5; p.x += p.velocity.x; p.y += p.velocity.y; p.opacity -= 0.01;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.globalAlpha = p.opacity; ctx.fill();
        if (p.opacity <= 0) particles.splice(i, 1);
      });
      if (particles.length > 0) requestAnimationFrame(animate);
    };
    animate();
  };

  const toggleCheck = (id: string) => {
    if (!checked.includes(id)) {
      setChecked([...checked, id]);
      triggerConfetti();
    } else {
      setChecked(checked.filter(i => i !== id));
    }
  };

  const progress = (checked.length / 3) * 100;

  const todayPassage = {
    ref: "마태복음 5:3-10",
    verses: [
      { no: 3, text: "심령이 가난한 자는 복이 있나니 천국이 그들의 것임이요" },
      { no: 4, text: "애통하는 자는 복이 있나니 그들이 위로를 받을 것임이요" },
      { no: 5, text: "온유한 자는 복이 있나니 그들이 땅을 기업으로 받을 것임이요" }
    ]
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-left pb-20 relative">
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[300]" />

      {/* 1. 상단 개인 성취 요약 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-zinc-100 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="relative w-20 h-20 mb-3 mx-auto">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-zinc-100" />
              <motion.circle 
                cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="8" fill="transparent" 
                strokeDasharray={213.6}
                initial={{ strokeDashoffset: 213.6 }}
                animate={{ strokeDashoffset: 213.6 - (213.6 * progress) / 100 }}
                className="text-[#4A6741]"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-black text-zinc-800">{Math.round(progress)}%</span>
            </div>
          </div>
          <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">오늘의 달성률</div>
        </div>

        <div className="space-y-3 text-left">
          <div className="bg-[#4A6741] rounded-[24px] p-4 text-white shadow-lg shadow-[#4A6741]/20 flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl"><Flame size={18} className="text-orange-300" /></div>
            <div>
              <div className="text-[10px] font-bold opacity-70">연속 기록</div>
              <div className="text-sm font-black">12일 달성 중</div>
            </div>
          </div>
          <div className="bg-white rounded-[24px] p-4 border border-zinc-100 flex items-center gap-3">
            <div className="bg-zinc-50 p-2 rounded-xl"><Trophy size={18} className="text-amber-400" /></div>
            <div>
              <div className="text-[10px] font-bold text-zinc-400">그룹 내 순위</div>
              <div className="text-sm font-black text-zinc-800">상위 5%</div>
            </div>
          </div>
        </div>
      </div>

      {/* 💡 마지막 제안: 주간 은혜 리포트 카드 */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[35px] p-6 text-white shadow-xl relative overflow-hidden">
        <Sparkles className="absolute right-[-10px] top-[-10px] w-24 h-24 text-white/10" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-white/20 p-1.5 rounded-lg"><BarChart3 size={16} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Weekly Grace Report</span>
          </div>
          <h4 className="text-lg font-black mb-1">이번 주 우리 그룹은...</h4>
          <p className="text-xs font-medium opacity-90 leading-relaxed">
            총 <span className="font-black text-yellow-300">142장</span>의 말씀을 읽고,<br/>
            <span className="font-black text-yellow-300">28개</span>의 감사 고백을 나눴습니다! 🌿
          </p>
          <button className="mt-4 flex items-center gap-1 text-[11px] font-black bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl transition-all">
            리포트 자세히 보기 <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* 2. 공동체 미션 현황 */}
      <section className="space-y-4">
        <h4 className="font-black text-zinc-900 text-sm px-1 text-left">주간 공동체 미션</h4>
        <div className="space-y-3">
          {[
            { id: 1, title: "매일 아침 말씀 묵상", count: 4, total: 7, icon: <BookOpen size={18} /> },
            { id: 2, title: "공동체 중보기도 참여", count: 2, total: 3, icon: <Users size={18} /> },
            { id: 3, title: "주일 예배 실황 인증", count: 0, total: 1, icon: <CheckCircle size={18} /> },
          ].map((mission) => {
            const mProgress = (mission.count / mission.total) * 100;
            return (
              <div key={mission.id} className="bg-white rounded-[28px] p-5 border border-zinc-100 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400">{mission.icon}</div>
                  <div className="flex-1 text-left">
                    <div className="text-[13px] font-black text-zinc-800">{mission.title}</div>
                    <div className="text-[10px] font-bold text-zinc-400">{mission.count}/{mission.total} 완료</div>
                  </div>
                  <CheckCircle size={20} className={mission.count === mission.total ? "text-[#4A6741]" : "text-zinc-200"} />
                </div>
                <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div style={{ width: `${mProgress}%` }} className="h-full bg-zinc-300" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. 개인 경건 훈련 리스트 */}
      <div className="bg-white rounded-[35px] p-8 shadow-sm border border-zinc-100">
        <div className="flex justify-between items-center mb-8 text-left">
          <div>
            <h3 className="font-black text-zinc-900 text-lg">경건 훈련</h3>
            <p className="text-xs font-bold text-zinc-400">매일 조금씩 하나님께 가까이</p>
          </div>
          <div className="w-10 h-10 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300"><CalIcon size={20} /></div>
        </div>
        <div className="space-y-5">
          {[
            { id: 'bible', label: '성경 읽기 (3장)', sub: '마태복음 5-7장' },
            { id: 'pray', label: '개인 기도 (20분)', sub: '오전 07:30 완료' },
            { id: 'meditation', label: '오늘의 묵상', sub: '음성으로 기록 남기기' }
          ].map((task) => (
            <div key={task.id} className="relative text-left">
              <motion.div 
                onClick={() => task.id === 'bible' ? setShowBibleReader(true) : toggleCheck(task.id)}
                className={`p-5 rounded-[28px] border-2 transition-all flex items-center justify-between cursor-pointer ${
                  checked.includes(task.id) ? 'bg-white border-[#4A6741] shadow-md' : 'bg-zinc-50 border-transparent text-zinc-400'
                }`}
              >
                <div className="flex gap-4 items-center">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                    checked.includes(task.id) ? 'bg-[#4A6741] text-white' : 'bg-white border border-zinc-200 text-transparent'
                  }`}><Check size={16} strokeWidth={4} /></div>
                  <div>
                    <div className={`text-sm font-black ${checked.includes(task.id) ? 'text-zinc-900' : 'text-zinc-400'}`}>{task.label}</div>
                    <div className="text-[10px] font-bold opacity-60">{task.sub}</div>
                  </div>
                </div>
                {task.id === 'meditation' && (
                  <button onClick={(e) => { e.stopPropagation(); setActiveRecording(task.id); }} className={`p-2 rounded-full ${checked.includes(task.id) ? 'text-[#4A6741] bg-[#4A6741]/5' : 'text-zinc-300'}`}><Mic size={20} /></button>
                )}
              </motion.div>
            </div>
          ))}
        </div>
      </div>

      {/* 모달 로직 */}
      <AnimatePresence>
        {showBibleReader && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="fixed inset-0 z-[200] bg-white p-6 pt-20">
            <div className="flex items-center justify-between mb-8">
              <button onClick={() => setShowBibleReader(false)} className="w-10 h-10 flex items-center justify-center bg-zinc-100 rounded-full"><X size={20}/></button>
              <h2 className="font-black text-lg text-zinc-800">{todayPassage.ref}</h2>
              <div className="w-10" />
            </div>
            <div className="space-y-8 overflow-y-auto max-h-[70vh] px-2 text-left">
              {todayPassage.verses.map(v => (
                <div key={v.no} className="flex gap-4">
                  <span className="font-black text-[#4A6741] text-sm pt-1.5 opacity-60">{v.no}</span>
                  <p className="text-lg font-bold text-zinc-700 leading-relaxed">{v.text}</p>
                </div>
              ))}
            </div>
            <div className="absolute bottom-10 left-6 right-6">
              <button onClick={() => { toggleCheck('bible'); setShowBibleReader(false); }} className="w-full py-5 bg-[#4A6741] text-white rounded-[24px] font-black">말씀 읽기 완료</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeRecording && (
          <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="fixed inset-x-4 bottom-24 z-[110] bg-white rounded-[35px] p-8 shadow-2xl border border-zinc-100">
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-black text-zinc-800">오늘의 묵상 기록</h4>
              <button onClick={() => setActiveRecording(null)}><X size={20} className="text-zinc-400"/></button>
            </div>
            <div className="flex flex-col items-center py-6">
               <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-4"><Mic size={32} className="text-orange-500 animate-pulse" /></div>
               <p className="text-xs font-bold text-zinc-400 text-center">말씀을 묵상하며 느낀 점을 들려주세요</p>
            </div>
            <button onClick={() => { toggleCheck('meditation'); setActiveRecording(null); }} className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black">녹음 완료</button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
