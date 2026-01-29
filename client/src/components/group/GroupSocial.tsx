import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Image as ImageIcon, MoreHorizontal, Heart, MessageCircle, 
  Send, Bookmark, Share2, Sparkles, Megaphone, ChevronRight, X 
} from "lucide-react";

export default function GroupSocial({ groupId, role }: any) {
  const [selectedPost, setSelectedPost] = useState<any>(null);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-left pb-32">
      {/* 1. 필독 공지 */}
      <div className="relative">
        <div className="flex items-center justify-between px-1 mb-3">
          <h4 className="font-black text-xs text-zinc-900 flex items-center gap-1.5"><Megaphone size={14} className="text-[#4A6741]" /> 필독 공지</h4>
          <button className="text-[10px] font-black text-zinc-400">전체보기 <ChevronRight size={10}/></button>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {[1, 2].map((i) => (
            <div key={i} className="min-w-[280px] bg-[#4A6741] rounded-[24px] p-5 text-white shadow-lg relative overflow-hidden">
              <Sparkles className="absolute right-[-10px] top-[-10px] w-16 h-16 opacity-10" />
              <div className="bg-white/20 w-fit px-2 py-0.5 rounded-full text-[9px] font-black mb-2 uppercase">Notice</div>
              <p className="text-sm font-bold leading-snug line-clamp-2">이번 주 토요일 소그룹 아웃리치 장소가 변경되었습니다.</p>
            </div>
          ))}
        </div>
      </div>

      {/* 2. 글쓰기 바 */}
      <div className="bg-white rounded-[28px] p-3 shadow-sm border border-zinc-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400"><ImageIcon size={18} /></div>
        <div className="flex-1 text-xs font-bold text-zinc-400">오늘의 은혜를 기록해보세요...</div>
        <button className="bg-[#4A6741] text-white px-4 py-2.5 rounded-2xl text-xs font-black">작성</button>
      </div>

      {/* 3. 피드 리스트 */}
      {[1, 2].map((post) => (
        <motion.div 
          key={post} 
          onClick={() => setSelectedPost({ id: post, author: "김하늘 자매", content: "오늘 아침 큐티 중에..." })}
          className="bg-white rounded-[35px] overflow-hidden shadow-sm border border-zinc-100"
        >
          <div className="p-5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-zinc-100" />
              <div><div className="text-sm font-black text-zinc-800">김하늘 자매</div><div className="text-[10px] font-bold text-zinc-400">2시간 전</div></div>
            </div>
            <MoreHorizontal size={20} className="text-zinc-300" />
          </div>
          <div className="px-5 aspect-[4/3] bg-zinc-50 mx-5 rounded-[28px] flex items-center justify-center text-zinc-200"><ImageIcon size={48} /></div>
          <div className="p-6"><p className="text-sm font-bold text-zinc-700 line-clamp-2">오늘 아침 큐티 중에 시편 23편 말씀이 너무 와닿았습니다. 🌿</p></div>
          <div className="px-6 py-5 bg-zinc-50 border-t border-zinc-100 flex justify-between items-center">
            <div className="flex gap-5">
              <button className="flex items-center gap-1.5 text-rose-500 font-black text-xs"><Heart size={18} fill={post===1?"currentColor":"none"}/> 12</button>
              <button className="flex items-center gap-1.5 text-zinc-400 font-black text-xs"><MessageCircle size={18}/> 4</button>
            </div>
            <Bookmark size={18} className="text-zinc-300" />
          </div>
        </motion.div>
      ))}

      {/* 포스트 상세 드릴다운 */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed inset-0 z-[200] bg-white p-6 pt-16">
            <button onClick={() => setSelectedPost(null)} className="mb-6"><X size={24}/></button>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100" />
              <div><h3 className="font-black">{selectedPost.author}</h3><p className="text-xs text-zinc-400 font-bold">교제나눔 · 지금</p></div>
            </div>
            <p className="text-lg font-bold text-zinc-700 leading-relaxed mb-10">{selectedPost.content}</p>
            <div className="border-t pt-6 flex gap-4"><input className="flex-1 bg-zinc-50 p-4 rounded-2xl text-sm" placeholder="따뜻한 격려의 댓글을 달아주세요" /><button className="p-4 bg-[#4A6741] text-white rounded-2xl"><Send size={20}/></button></div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
