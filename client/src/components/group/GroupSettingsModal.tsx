import React from "react";
import { motion } from "framer-motion";
import { X, UserCog, Shield, UserMinus, ChevronRight, Users } from "lucide-react";

export default function GroupSettingsModal({ group, onClose, role }: any) {
  return (
    <motion.div 
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[200] bg-white flex flex-col"
    >
      {/* 헤더 */}
      <div className="px-6 h-20 flex items-center justify-between border-b border-zinc-50">
        <h2 className="text-xl font-black text-zinc-900">모임 관리</h2>
        <button onClick={onClose} className="p-2 bg-zinc-100 rounded-full text-zinc-500">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* 모임 기본 정보 설정 */}
        <section>
          <h3 className="text-[12px] font-black text-zinc-400 uppercase tracking-widest mb-4">General Settings</h3>
          <div className="space-y-3">
            <button className="w-full p-5 bg-zinc-50 rounded-[24px] flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#4A6741] shadow-sm">
                  <UserCog size={20} />
                </div>
                <span className="font-bold text-zinc-800">모임 정보 수정</span>
              </div>
              <ChevronRight size={18} className="text-zinc-300" />
            </button>
          </div>
        </section>

        {/* 멤버 관리 섹션 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[12px] font-black text-zinc-400 uppercase tracking-widest">Member Management</h3>
            <span className="text-[10px] font-bold text-[#4A6741] bg-[#4A6741]/10 px-2 py-0.5 rounded-full">
              총 {group?.member_count || 12}명
            </span>
          </div>

          <div className="bg-white border border-zinc-100 rounded-[32px] overflow-hidden shadow-sm">
            {[
              { name: "김에스더", role: "leader", img: "김" },
              { name: "이요한", role: "member", img: "이" },
              { name: "박마리아", role: "member", img: "박" },
            ].map((member, i) => (
              <div key={i} className="p-4 flex items-center justify-between border-b border-zinc-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center font-black text-zinc-400 text-xs">
                    {member.img}
                  </div>
                  <div>
                    <div className="text-sm font-black text-zinc-800 flex items-center gap-1.5">
                      {member.name}
                      {member.role === 'leader' && <Shield size={12} className="text-amber-500 fill-amber-500" />}
                    </div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase">{member.role}</div>
                  </div>
                </div>
                
                {role === 'owner' && (
                  <div className="flex gap-1">
                    <button className="p-2 text-zinc-300 hover:text-rose-500 transition-colors">
                      <UserMinus size={18} />
                    </button>
                    <button className="p-2 text-zinc-300 hover:text-[#4A6741] transition-colors">
                      <UserCog size={18} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 위험 구역 */}
        {role === 'owner' && (
          <section className="pt-4">
            <button className="w-full py-5 border border-rose-100 text-rose-500 rounded-[24px] font-black text-sm">
              모임 해체하기
            </button>
          </section>
        )}
      </div>
    </motion.div>
  );
}
