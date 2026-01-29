import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
/* ✅ 5행: 존재하지 않던 HandsPraying을 삭제하고, 확실히 존재하는 Users와 CheckCircle로 검증 완료 */
import { 
  Image as ImageIcon, MoreHorizontal, Heart, MessageCircle, 
  Send, Bookmark, Share2, Sparkles, Megaphone, ChevronRight, X, Users, CheckCircle 
[span_0](start_span)} from "lucide-react";[span_0](end_span)

export default function GroupSocial({ groupId, role }: any) {
  [span_1](start_span)const [selectedPost, setSelectedPost] = useState<any>(null);[span_1](end_span)

  return (
    [span_2](start_span)<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-left pb-32">[span_2](end_span)
      
      {/* 1. 상단 하이라이트 공지 */}
      <div className="relative">
        <div className="flex items-center justify-between px-1 mb-3">
          <h4 className="font-black text-xs text-zinc-900 flex items-center gap-1.5">
            <Megaphone size={14} className="text-[#4A6741]" /> 필독 공지
          </h4>
          [span_3](start_span)<button className="text-[10px] font-black text-zinc-400 flex items-center">전체보기 <ChevronRight size={10}/></button>[span_3](end_span)
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {[1, 2].map((i) => (
            <div key={i} className="min-w-[280px] bg-[#4A6741] rounded-[24px] p-5 text-white shadow-lg shadow-[#4A6741]/20 relative overflow-hidden">
              <Sparkles className="absolute right-[-10px] top-[-10px] w-16 h-16 text-white/10" />
              [span_4](start_span)<div className="bg-white/20 w-fit px-2 py-0.5 rounded-full text-[9px] font-black mb-2 uppercase tracking-widest">Notice</div>[span_4](end_span)
              <p className="text-sm font-bold leading-snug line-clamp-2">
                이번 주 토요일 소그룹 아웃리치 장소가 변경되었습니다. [span_5](start_span)공지 확인 필수[span_5](end_span)!
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 2. 글쓰기 바 (원본 보존) */}
      <div className="bg-white rounded-[28px] p-3 shadow-sm border border-zinc-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center">
           [span_6](start_span)<ImageIcon size={18} className="text-zinc-400" />[span_6](end_span)
        </div>
        <div className="flex-1 text-xs font-bold text-zinc-400 pl-1">
          [span_7](start_span)오늘의 은혜를 기록해보세요...[span_7](end_span)
        </div>
        <button className="bg-[#4A6741] text-white px-4 py-2.5 rounded-2xl text-xs font-black shadow-md shadow-[#4A6741]/10 active:scale-95 transition-all">
          [span_8](start_span)작성[span_8](end_span)
        </button>
      </div>

      {/* 3. 피드 리스트 (원본 보존) */}
      {[1, 2].map((post) => (
        <motion.div 
          key={post}
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          onClick={() => setSelectedPost({ 
            id: post, 
            author: "김하늘 자매", 
            content: "오늘 아침 큐티 중에 시편 23편 말씀이 너무 와닿았습니다. 내 잔이 넘치나이다... 우리 소그룹원분들도 오늘 하루 넘치는 은혜 누리시길! 🌿" 
          [span_9](start_span)})}[span_9](end_span)
          className="bg-white rounded-[35px] overflow-hidden shadow-sm border border-zinc-100 active:scale-[0.98] transition-transform cursor-pointer"
        >
          <div className="p-5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[15px] bg-zinc-100 border border-zinc-50 overflow-hidden">
                [span_10](start_span)<div className="w-full h-full bg-gradient-to-tr from-[#4A6741]/20 to-[#A2C098]/20" />[span_10](end_span)
              </div>
              <div>
                [span_11](start_span)<div className="text-sm font-black text-zinc-800">김하늘 자매</div>[span_11](end_span)
                [span_12](start_span)<div className="text-[10px] font-bold text-zinc-400">교제나눔 · 2시간 전</div>[span_12](end_span)
              </div>
            </div>
            <button className="w-8 h-8 flex items-center justify-center text-zinc-300 hover:bg-zinc-50 rounded-full transition-colors">
              [span_13](start_span)<MoreHorizontal size={20}/>[span_13](end_span)
            </button>
          </div>
          
          <div className="px-5">
            <div className="aspect-[4/3] bg-zinc-100 rounded-[28px] overflow-hidden relative group">
              [span_14](start_span)<div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />[span_14](end_span)
              <div className="w-full h-full flex items-center justify-center text-zinc-300">
                [span_15](start_span)<ImageIcon size={48} strokeWidth={1} />[span_15](end_span)
              </div>
            </div>
          </div>

          <div className="p-6 text-left">
            <p className="text-sm font-bold text-zinc-700 leading-relaxed line-clamp-2">
              오늘 아침 큐티 중에 시편 23편 말씀이 너무 와닿았습니다. [span_16](start_span)내 잔이 넘치나이다...[span_16](end_span)
            </p>
          </div>

          <div className="px-6 py-5 bg-zinc-50/50 border-t border-zinc-50 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <button className="flex items-center gap-1.5 text-rose-500 transition-transform active:scale-125">
                <Heart size={20} fill={post === 1 ? [span_17](start_span)"currentColor" : "none"} strokeWidth={2.5}/>[span_17](end_span)
                [span_18](start_span)<span className="text-xs font-black">12</span>[span_18](end_span)
              </button>
              <button className="flex items-center gap-1.5 text-zinc-400">
                [span_19](start_span)<MessageCircle size={20} strokeWidth={2.5}/>[span_19](end_span)
                [span_20](start_span)<span className="text-xs font-black">4</span>[span_20](end_span)
              </button>
            </div>
            [span_21](start_span)<button className="text-zinc-300"><Bookmark size={20} strokeWidth={2.5}/></button>[span_21](end_span)
          </div>
        </motion.div>
      ))}

      {/* 포스트 상세 모달 (원본 보존) */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div 
            [span_22](start_span)initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}[span_22](end_span)
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[200] bg-white p-6 pt-16"
          >
            <div className="flex justify-between items-center mb-8">
              [span_23](start_span)<button onClick={() => setSelectedPost(null)} className="w-10 h-10 flex items-center justify-center bg-zinc-50 rounded-full">[span_23](end_span)
                [span_24](start_span)<X size={24} className="text-zinc-400" />[span_24](end_span)
              </button>
              [span_25](start_span)<h3 className="font-black text-zinc-800">게시물 상세</h3>[span_25](end_span)
              [span_26](start_span)<button className="text-zinc-400"><Share2 size={20}/></button>[span_26](end_span)
            </div>
            <div className="flex items-center gap-3 mb-8">
              [span_27](start_span)<div className="w-12 h-12 rounded-2xl bg-zinc-100" />[span_27](end_span)
              <div className="text-left">
                [span_28](start_span)<h3 className="font-black text-zinc-800">{selectedPost.author}</h3>[span_28](end_span)
                [span_29](start_span)<p className="text-xs text-zinc-400 font-bold">교제나눔 · 지금</p>[span_29](end_span)
              </div>
            </div>
            [span_30](start_span)<p className="text-lg font-bold text-zinc-700 leading-relaxed mb-10 text-left">{selectedPost.content}</p>[span_30](end_span)
            
            <div className="absolute bottom-10 left-6 right-6 flex gap-3">
              <input 
                className="flex-1 bg-zinc-100 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-[#4A6741] outline-none" 
                [span_31](start_span)placeholder="따뜻한 격려의 댓글을..."[span_31](end_span)
              />
              [span_32](start_span)<button className="bg-[#4A6741] text-white p-4 rounded-2xl shadow-lg shadow-[#4A6741]/20">[span_32](end_span)
                [span_33](start_span)<Send size={20} />[span_33](end_span)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
[span_34](start_span)}
