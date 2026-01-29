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
      
      {/* 1. 상단 하이라이트 공지 */}
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
          onClick={() => setSelectedPost({ id: post, author: "김하늘 자매", content: "오늘 아침 큐티 중에 시편 23편 말씀이 너무 와닿았습니다. 내 잔이 넘치나이다... 우리 소그룹원분들도 오늘 하루 넘치는 은혜 누리시길! 🌿" })}
          className="bg-white rounded-[35px] overflow-hidden shadow-sm border border-zinc-100 active:scale-[0.98] transition-transform cursor-pointer"
        >
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
          
          <div className="px-5">
            <div className="aspect-[4/3] bg-zinc-100 rounded-[28px] overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
              <div className="w-full h-full flex items-center justify-center text-zinc-300">
                <ImageIcon size={48} strokeWidth={1} />
              </div>
            </div>
          </div>

          <div className="p-6">
            <p className="text-sm font-bold text-zinc-700 leading-relaxed line-clamp-2">
              오늘 아침 큐티 중에 시편 23편 말씀이 너무 와닿았습니다. 내 잔이 넘치나이다... 
            </p>
          </div>

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
            </div>
            <button className="text-zinc-300"><Bookmark size={20} strokeWidth={2.5}/></button>
          </div>
        </motion.div>
      ))}

      {/* 드릴다운: 포스트 상세 */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[200] bg-white p-6 pt-16"
          >
            <div className="flex justify-between items-center mb-8">
              <button onClick={() => setSelectedPost(null)} className="w-10 h-10 flex items-center justify-center bg-zinc-50 rounded-full"><X size={24} className="text-zinc-400" /></button>
              <h3 className="font-black text-zinc-800">게시물 상세</h3>
              <button className="text-zinc-400"><Share2 size={20}/></button>
            </div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100" />
              <div>
                <h3 className="font-black text-zinc-800">{selectedPost.author}</h3>
                <p className="text-xs text-zinc-400 font-bold">교제나눔 · 지금</p>
              </div>
            </div>
            <p className="text-lg font-bold text-zinc-700 leading-relaxed mb-10">{selectedPost.content}</p>
            
            <div className="absolute bottom-10 left-6 right-6 flex gap-3">
              <input 
                className="flex-1 bg-zinc-100 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-[#4A6741] outline-none" 
                placeholder="따뜻한 격려의 댓글을..." 
              />
              <button className="bg-[#4A6741] text-white p-4 rounded-2xl shadow-lg shadow-[#4A6741]/20">
                <Send size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
