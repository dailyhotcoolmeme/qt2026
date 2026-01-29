import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Image as ImageIcon, MoreHorizontal, Heart, MessageCircle, 
  Send, Bookmark, Share2, Sparkles, Megaphone, ChevronRight, X, 
  Users, CheckCircle, Flame, Star, Zap 
} from "lucide-react";

export default function GroupSocial({ groupId, role }: any) {
  const [selectedPost, setSelectedPost] = useState<any>(null);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-left pb-32">
      
      {/* 제안 기능 1: 실시간 공동체 현황 (Synergy) */}
      <div className="bg-gradient-to-r from-[#4A6741] to-[#6A8761] rounded-[30px] p-5 text-white shadow-lg relative overflow-hidden">
        <Zap className="absolute right-[-5px] top-[-5px] w-12 h-12 text-white/10 rotate-12" />
        <div className="flex items-center gap-3 mb-1">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-[#4A6741] bg-white/20 backdrop-blur-md" />
            ))}
          </div>
          <span className="text-[11px] font-black opacity-90 uppercase tracking-tighter">Live together</span>
        </div>
        <p className="text-sm font-bold">지금 <span className="text-yellow-300">7명</span>의 지체가 함께 말씀을 읽고 있어요!</p>
      </div>

      {/* 1. 상단 하이라이트 공지 (기본 원본 유지) */}
      <div className="relative">
        <div className="flex items-center justify-between px-1 mb-3">
          <h4 className="font-black text-xs text-zinc-900 flex items-center gap-1.5">
            <Megaphone size={14} className="text-[#4A6741]" /> 필독 공지
          </h4>
          <button className="text-[10px] font-black text-zinc-400 flex items-center">전체보기 <ChevronRight size={10}/></button>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {[1, 2].map((i) => (
            <div key={i} className="min-w-[280px] bg-white rounded-[24px] p-5 border border-zinc-100 shadow-sm relative overflow-hidden">
              <div className="bg-[#4A6741]/10 text-[#4A6741] w-fit px-2 py-0.5 rounded-full text-[9px] font-black mb-2 uppercase">Notice</div>
              <p className="text-sm font-bold text-zinc-800 leading-snug line-clamp-2">
                이번 주 토요일 소그룹 아웃리치 장소가 변경되었습니다.
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 제안 기능 2: 주간 그룹 랭킹/배지 (Motivation) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-orange-50 rounded-[28px] p-4 flex items-center gap-3 border border-orange-100/50">
          <div className="bg-orange-500 text-white p-2 rounded-xl"><Flame size={16} /></div>
          <div>
            <div className="text-[9px] font-black text-orange-500 uppercase">Group Streak</div>
            <div className="text-xs font-black text-zinc-800">15일째 불타는 중</div>
          </div>
        </div>
        <div className="bg-amber-50 rounded-[28px] p-4 flex items-center gap-3 border border-amber-100/50">
          <div className="bg-amber-500 text-white p-2 rounded-xl"><Star size={16} /></div>
          <div>
            <div className="text-[9px] font-black text-amber-500 uppercase">Best Member</div>
            <div className="text-xs font-black text-zinc-800">이달의 큐티왕</div>
          </div>
        </div>
      </div>

      {/* 2. 글쓰기 바 (원본 보존) */}
      <div className="bg-white rounded-[28px] p-3 shadow-sm border border-zinc-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center">
           <ImageIcon size={18} className="text-zinc-400" />
        </div>
        <div className="flex-1 text-xs font-bold text-zinc-400 pl-1">오늘의 은혜를 기록해보세요...</div>
        <button className="bg-[#4A6741] text-white px-4 py-2.5 rounded-2xl text-xs font-black shadow-md">작성</button>
      </div>

      {/* 3. 피드 리스트 (원본 보존 및 리액션 추가) */}
      {[1, 2].map((post) => (
        <motion.div 
          key={post}
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          className="bg-white rounded-[35px] overflow-hidden shadow-sm border border-zinc-100"
        >
          <div className="p-5 flex justify-between items-center">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-[15px] bg-zinc-100 overflow-hidden" />
              <div>
                <div className="text-sm font-black text-zinc-800">김하늘 자매</div>
                <div className="text-[10px] font-bold text-zinc-400">교제나눔 · 2시간 전</div>
              </div>
            </div>
            <button className="text-zinc-300"><MoreHorizontal size={20}/></button>
          </div>
          
          <div className="px-5">
            <div className="aspect-[4/3] bg-zinc-100 rounded-[28px] flex items-center justify-center text-zinc-300">
              <ImageIcon size={48} strokeWidth={1} />
            </div>
          </div>

          <div className="p-6 text-left">
            <p className="text-sm font-bold text-zinc-700 leading-relaxed line-clamp-2">
              오늘 아침 큐티 중에 시편 23편 말씀이 너무 와닿았습니다. 내 잔이 넘치나이다...
            </p>
          </div>

          <div className="px-6 py-5 bg-zinc-50/50 border-t border-zinc-50 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <button className="flex items-center gap-1.5 text-rose-500">
                <Heart size={20} fill={post === 1 ? "currentColor" : "none"} />
                <span className="text-xs font-black">12</span>
              </button>
              <button className="flex items-center gap-1.5 text-[#4A6741]">
                <Users size={20} />
                <span className="text-xs font-black">기도중</span>
              </button>
            </div>
            <button className="text-zinc-300"><Bookmark size={20}/></button>
          </div>
        </motion.div>
      ))}

      {/* 상세 모달 생략 없이 제공 (원본 로직 유지) */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            className="fixed inset-0 z-[200] bg-white p-6 pt-16"
          >
            <div className="flex justify-between items-center mb-8">
              <button onClick={() => setSelectedPost(null)} className="w-10 h-10 flex items-center justify-center bg-zinc-50 rounded-full">
                <X size={24} className="text-zinc-400" />
              </button>
              <h3 className="font-black text-zinc-800 text-left">게시물 상세</h3>
              <button className="text-zinc-400"><Share2 size={20}/></button>
            </div>
            <div className="text-left mb-6">
               <p className="text-lg font-bold text-zinc-700">{selectedPost.content}</p>
            </div>
            <div className="absolute bottom-10 left-6 right-6 flex gap-3">
              <input className="flex-1 bg-zinc-100 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none" placeholder="댓글을 입력하세요..." />
              <button className="bg-[#4A6741] text-white p-4 rounded-2xl"><Send size={20} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
