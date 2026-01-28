import React from "react";
import { motion } from "framer-motion";
import { Image, MoreHorizontal, Heart, MessageCircle, Send } from "lucide-react";

export default function GroupSocial({ groupId, role }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-left pb-10">
      {/* 글쓰기 입구 */}
      <div className="bg-white rounded-[28px] p-4 shadow-sm border border-zinc-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-zinc-100" />
        <div className="flex-1 bg-zinc-50 rounded-2xl py-2.5 px-4 text-xs font-bold text-zinc-400">
          오늘의 은혜를 나눠보세요...
        </div>
        <button className="p-2 text-[#4A6741]"><Image size={20}/></button>
      </div>

      {/* 피드 목록 */}
      {[1, 2].map((post) => (
        <div key={post} className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-zinc-100">
          <div className="p-5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-100" />
              <div>
                <div className="text-sm font-black text-zinc-800">최요한 청년</div>
                <div className="text-[10px] font-bold text-zinc-400">3시간 전</div>
              </div>
            </div>
            <button className="text-zinc-300"><MoreHorizontal size={20}/></button>
          </div>
          
          <div className="px-5 pb-4">
            <p className="text-sm font-bold text-zinc-700 leading-relaxed">
              오늘 아침 말씀 묵상을 통해 정말 큰 위로를 받았습니다. 
              우리 공동체 모두에게도 동일한 은혜가 있기를 기도해요! 🙏
            </p>
          </div>
          
          <div className="aspect-square bg-zinc-100 mx-5 rounded-[24px] mb-4 flex items-center justify-center">
            <Image size={40} className="text-zinc-200" />
          </div>

          <div className="px-5 py-4 border-t border-zinc-50 flex items-center gap-6">
            <button className="flex items-center gap-1.5 text-zinc-400 text-xs font-bold"><Heart size={18}/> 12</button>
            <button className="flex items-center gap-1.5 text-zinc-400 text-xs font-bold"><MessageCircle size={18}/> 5</button>
            <button className="ml-auto text-zinc-300"><Send size={18}/></button>
          </div>
        </div>
      ))}
    </motion.div>
  );
}
