import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { supabase } from "../lib/supabase";
import { LogIn, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnTo?: string; // Optional explicit page to return to after login
}

export function LoginModal({ open, onOpenChange, returnTo }: LoginModalProps) {
  const [showManualLogin, setShowManualLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { register, getValues } = useForm();

  const handleKakaoLogin = () => {
    // Use provided returnTo or fall back to current location
    const targetReturnTo = returnTo || window.location.href;
    // Persist desired return target as a fallback for post-OAuth navigation
    try {
      localStorage.setItem('qt_return', targetReturnTo);
      if (targetReturnTo.includes('autoOpenWrite=true')) {
        localStorage.setItem('qt_autoOpenWrite', '1');
      }
    } catch (e) {
      // ignore storage errors
    }
    const encodedReturnTo = encodeURIComponent(targetReturnTo);
    const redirectTo = `${window.location.origin}/?returnTo=${encodedReturnTo}`;
    supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo },
    }).catch((e) => {
      // eslint-disable-next-line no-console
      console.error("LoginModal kakao start error", e);
      window.location.href = `/auth?returnTo=${encodedReturnTo}`;
    });
  };

  const handleManualLogin = async () => {
    const values = getValues();
    if (!values.email || !values.password) {
      setErrorMsg("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    setIsLoading(true);
    setErrorMsg("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) throw error;
      // 로그인 성공 - use localStorage return fallback or navigate directly
      const targetReturnTo = returnTo || window.location.href;
      try {
        localStorage.setItem('qt_return', targetReturnTo);
        if (targetReturnTo.includes('autoOpenWrite=true')) {
          localStorage.setItem('qt_autoOpenWrite', '1');
        }
      } catch (e) {}
      window.location.href = targetReturnTo;
    } catch (e: any) {
      setErrorMsg(e.message || "로그인에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[320px] rounded-2xl">
        <DialogHeader className="text-center">
          <DialogTitle className="text-lg">로그인이 필요합니다</DialogTitle>
          <DialogDescription className="text-sm text-zinc-500">
            묵상을 기록하고 나누려면 먼저 로그인해 주세요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          {!showManualLogin ? (
            <>
              <Button 
                onClick={handleKakaoLogin}
                className="w-full bg-[#FEE500] hover:bg-[#FDD800] text-[#3C1E1E] font-semibold rounded-xl py-5"
                data-testid="button-kakao-login"
              >
                <LogIn className="mr-2 h-5 w-5" />
                카카오로 한 번에 가입하기
              </Button>
              <button 
                onClick={() => { setShowManualLogin(true); setErrorMsg(""); }}
                className="w-full text-sm text-zinc-500 font-semibold py-2 hover:text-zinc-700"
              >
                이메일로 로그인
              </button>
              <Button 
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full rounded-xl py-5"
                data-testid="button-cancel-login"
              >
                나중에 하기
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <input 
                  {...register("email")}
                  type="email"
                  placeholder="이메일"
                  className="w-full px-4 py-3 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#4A6741]"
                />
                <div className="relative">
                  <input 
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="비밀번호"
                    className="w-full px-4 py-3 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#4A6741] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-zinc-400"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errorMsg && (
                  <p className="text-red-500 text-sm font-semibold">{errorMsg}</p>
                )}
                <Button
                  onClick={handleManualLogin}
                  disabled={isLoading}
                  className="w-full bg-[#4A6741] hover:bg-[#3a5232] text-white font-semibold rounded-lg py-3"
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  로그인
                </Button>
                <button
                  onClick={() => { setShowManualLogin(false); setErrorMsg(""); }}
                  className="w-full text-sm text-zinc-500 font-semibold py-2 hover:text-zinc-700"
                >
                  돌아가기
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
