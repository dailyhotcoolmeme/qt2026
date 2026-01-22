import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { supabase } from "../lib/supabase"; 
import { useLocation, Link } from "wouter";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const form = useForm({
    defaultValues: { username: "", password: "" }
  });

  const handleKakaoLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (error: any) {
      alert("카카오 로그인 실패: " + error.message);
    }
  };

  const onSubmit = async (values: any) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: `${values.username}@church.com`,
        password: values.password
      });
      if (error) throw error;
      window.location.href = "/"; // 확실한 이동을 위해 href 사용
    } catch (error: any) {
      alert("로그인 실패: " + error.message);
    }
  };

  return (
    // 1. pt-0으로 상단 여백을 아예 없애고, 중앙 정렬로 스크롤을 방지했습니다.
    <div className="h-screen w-full flex flex-col items-center justify-center bg-white p-6 overflow-hidden">
      <div className="w-full max-w-[400px] space-y-8">
        
        {/* 2. X 버튼과 그 공간을 완전히 삭제하고 제목을 최상단에 배치 */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none">환영합니다!</h1>
          <p className="text-gray-400 font-bold">오늘도 말씀으로 하루를 시작하세요.</p>
        </div>

        <div className="space-y-4">
          <button 
            type="button"
            onClick={handleKakaoLogin}
            className="w-full h-14 bg-[#FEE500] text-[#3C1E1E] text-lg font-black rounded-sm shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-transform"
          >
            <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" className="w-5 h-5" alt="kakao" />
            카카오 로그인
          </button>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100" /></div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white px-3 text-gray-300 font-bold">OR</span>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-gray-400 ml-1 uppercase tracking-wider">아이디</Label>
              <Input {...form.register("username")} className="h-12 bg-gray-50 border-none rounded-sm text-base px-5 shadow-inner" placeholder="아이디 입력" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-gray-400 ml-1 uppercase tracking-wider">비밀번호</Label>
              <Input {...form.register("password")} type="password" className="h-12 bg-gray-50 border-none rounded-sm text-base px-5 shadow-inner" placeholder="비밀번호 입력" />
            </div>
            <Button className="w-full h-14 bg-[#7180B9] text-white text-lg font-black rounded-sm shadow-md mt-2" type="submit">
              로그인하기
            </Button>
          </form>
        </div>

        <div className="flex flex-col items-center gap-6">
          <Link href="/register" className="text-xs text-gray-400 font-bold underline underline-offset-4">
            회원가입이 필요하신가요?
          </Link>

          {/* 3. 닫기 버튼: 무조건 작동하도록 window.location.href 사용 */}
          <button 
            type="button"
            onClick={() => window.location.href = "/"}
            className="w-full h-14 bg-white border border-gray-200 text-gray-400 text-lg font-bold rounded-sm active:bg-gray-50 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
