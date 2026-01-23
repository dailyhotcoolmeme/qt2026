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

  // 1. 카카오 로그인 실행 함수
  const handleKakaoLogin = async () => {
    try {
      // [핵심 대안] HashRouter 사용 시, 카카오가 '#' 뒤를 버리지 못하도록 
      // 리다이렉트 주소에 명시적으로 /#/ 를 붙여줍니다. 
      // 이렇게 해야 돌아올 때 404 깜빡임 없이 리액트 앱으로 바로 진입합니다.
      const redirectUrl = `${window.location.origin}/#/`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: redirectUrl
        }
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

      // [중요] 여기에서 setLocation("/")을 절대 사용하지 않습니다.
      // 로그인이 완료되면 각 페이지(ReadingPage 등)의 onAuthStateChange 리스너가
      // 세션을 감지하여 모달만 닫거나 화면을 갱신할 것입니다.

    } catch (error: any) {
      alert("로그인 실패: " + error.message);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start bg-white p-6 pt-20">
      <div className="w-full max-w-[400px] space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">환영합니다!</h1>
          <p className="text-gray-400 font-bold">오늘도 말씀으로 하루를 시작하세요.</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-500 ml-1">아이디</Label>
            <Input 
              {...form.register("username")} 
              className="h-16 bg-gray-50 border-none rounded-2xl text-lg px-6 focus:ring-2 focus:ring-[#7180B9]" 
              placeholder="아이디 입력" 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-500 ml-1">비밀번호</Label>
            <Input 
              {...form.register("password")} 
              type="password" 
              className="h-16 bg-gray-50 border-none rounded-2xl text-lg px-6 focus:ring-2 focus:ring-[#7180B9]" 
              placeholder="비밀번호 입력" 
            />
          </div>
          
          <Button 
            className="w-full h-16 bg-[#7180B9] text-white text-xl font-black rounded-2xl shadow-xl mt-4 active:scale-[0.98] transition-all" 
            type="submit"
          >
            로그인하기
          </Button>

          {/* 카카오 로그인 버튼 */}
          <button 
            type="button"
            onClick={handleKakaoLogin}
            className="w-full h-16 bg-[#FEE500] text-[#3C1E1E] text-xl font-black rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-transform"
          >
            <img 
              src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" 
              className="w-6 h-6" 
              alt="kakao" 
            />
            카카오 로그인
          </button>

          <div className="pt-8 flex flex-col items-center gap-4 border-t border-gray-100">
            <p className="text-sm text-gray-400 font-bold">처음 방문하셨나요?</p>
            <Link href="/register" className="w-full">
              <a className="w-full h-16 flex items-center justify-center border-2 border-[#7180B9] text-[#7180B9] text-xl font-black rounded-2xl hover:bg-blue-50 transition-colors shadow-sm">
                회원가입 하러 가기
              </a>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
