import React from "react";
import { motion } from "framer-motion";
import { 
  Image as ImageIcon, MoreHorizontal, Heart, MessageCircle, 
  Send, Bookmark, Share2, Sparkles, Megaphone, ChevronRight 
} from "lucide-react";

export default function GroupSocial({ groupId, role }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-left pb-32">
      
      {/* 1. 상단 하이라이트 공지 (Horizontal Scroll) */}
      <div className="relative">
        <div className="flex items-center justify-between px-1 mb-3">
          <h4 className="font-black text-xs text-zinc-900 flex items-center gap-1.5">
            <Megaphone size={14} className="text-[#4A6741]" /> 필독 공지
          </h4>
          <button className="text-[10px] font-black text-zinc-400 flex items-center">전체보기 <ChevronRight size={10}/></button>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {[1, 2].map((i) => (
            <div key={i} className="min-w-[280px] bg-[#4A6741] rounded-[24px] p-5 text-white shadow-lg shadow-[#4A6741]/20 relative overflow-hidden">
              <Sparkles className="absolute right-[-10px] top-[-10px] w-16 h-16 text-white/10" />
              <div className="bg-white/20 w-fit px-2 py-0.5 rounded-full text-[9px] font-black mb-2 uppercase tracking-widest">Notice</div>
              <p className="text-sm font-bold leading-snug line-clamp-2">이번 주 토요일 소그룹 아웃리치 장소가 변경되었습니다. 공지 확인 필수!</p>
            </div>
          ))}
        </div>
      </div>

      {/* 2. 감성적인 글쓰기 바 */}
      <div className="bg-white rounded-[28px] p-3 shadow-sm border border-zinc-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center">
           <ImageIcon size={18} className="text-zinc-400" />
        </div>
        <div className="flex-1 text-xs font-bold text-zinc-400 pl-1">
          오늘의 은혜를 기록해보세요...
        </div>
        <button className="bg-[#4A6741] text-white px-4 py-2.5 rounded-2xl text-xs font-black shadow-md shadow-[#4A6741]/10 active:scale-95 transition-all">
          작성
        </button>
      </div>

      {/* 3. 프리미엄 피드 리스트 */}
      {[1, 2].map((post) => (
        <motion.div 
          key={post}
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          className="bg-white rounded-[35px] overflow-hidden shadow-sm border border-zinc-100"
        >
          {/* 포스트 헤더 */}
          <div className="p-5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[15px] bg-zinc-100 border border-zinc-50 overflow-hidden">
                <div className="w-full h-full bg-gradient-to-tr from-[#4A6741]/20 to-[#A2C098]/20" />
              </div>
              <div>
                <div className="text-sm font-black text-zinc-800">김하늘 자매</div>
                <div className="text-[10px] font-bold text-zinc-400">교제나눔 · 2시간 전</div>
              </div>
            </div>
            <button className="w-8 h-8 flex items-center justify-center text-zinc-300 hover:bg-zinc-50 rounded-full transition-colors">
              <MoreHorizontal size={20}/>
            </button>
          </div>
          
          {/* 포스트 이미지 섹션 */}
          <div className="px-5">
            <div className="aspect-[4/3] bg-zinc-100 rounded-[28px] overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-full h-full flex items-center justify-center text-zinc-300">
                <ImageIcon size={48} strokeWidth={1} />
              </div>
              {/* 이미지 우측 하단 페이지네이션 느낌 */}
              <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md px-2 py-1 rounded-lg text-[9px] font-black text-white">1/3</div>
            </div>
          </div>

          {/* 포스트 본문 */}
          <div className="p-6">
            <p className="text-sm font-bold text-zinc-700 leading-relaxed">
              오늘 아침 큐티 중에 시편 23편 말씀이 너무 와닿았습니다. 내 잔이 넘치나이다... 
              우리 소그룹원분들도 오늘 하루 넘치는 은혜 누리시길! 🌿
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-[10px] font-black text-[#4A6741] bg-[#4A6741]/5 px-2 py-1 rounded-md">#큐티나눔</span>
              <span className="text-[10px] font-black text-[#4A6741] bg-[#4A6741]/5 px-2 py-1 rounded-md">#시편23편</span>
            </div>
          </div>

          {/* 포스트 액션 (리액션) */}
          <div className="px-6 py-5 bg-zinc-50/50 border-t border-zinc-50 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <button className="flex items-center gap-1.5 text-rose-500 transition-transform active:scale-125">
                <Heart size={20} fill={post === 1 ? "currentColor" : "none"} strokeWidth={2.5}/>
                <span className="text-xs font-black">12</span>
              </button>
              <button className="flex items-center gap-1.5 text-zinc-400">
                <MessageCircle size={20} strokeWidth={2.5}/>
                <span className="text-xs font-black">4</span>
              </button>
              <button className="text-zinc-400">
                <Share2 size={19} strokeWidth={2.5}/>
              </button>
            </div>
            <button className="text-zinc-300 hover:text-[#4A6741] transition-colors">
              <Bookmark size={20} strokeWidth={2.5}/>
            </button>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
