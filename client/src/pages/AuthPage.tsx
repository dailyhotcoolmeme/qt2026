// AuthPage.tsx (단순화 버전)
export default function AuthPage() {
  const [, setLocation] = useLocation();

  const handleKakaoLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: { redirectTo: window.location.origin + '/main' }
      });
      if (error) throw error;
    } catch (error: any) {
      alert("카카오 로그인 실패: " + error.message);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white p-8">
      <div className="w-full max-w-[400px] space-y-12 text-center">
        {/* 따뜻한 환영 문구 */}
        <div className="space-y-4">
          <h1 className="text-3xl font-black text-gray-900">당신만을 위한<br/>신앙 기록 공간</h1>
          <p className="text-gray-400 font-medium">오늘도 나를 돌보는 시간을 가져보세요.</p>
        </div>

        <div className="space-y-4">
          {/* 핵심인 카카오 로그인만 강조 */}
          <button 
            onClick={handleKakaoLogin}
            className="w-full h-16 bg-[#FEE500] text-[#3C1E1E] text-lg font-bold rounded-2xl shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-transform"
          >
            <img src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png" className="w-6 h-6" alt="kakao" />
            카카오로 3초만에 시작하기
          </button>

          {/* 비회원 둘러보기 버튼 (사용자님의 핵심 요구사항) */}
          <button 
            onClick={() => setLocation("/main")}
            className="w-full h-16 bg-white border border-gray-200 text-gray-500 text-lg font-bold rounded-2xl hover:bg-gray-50 transition-colors"
          >
            로그인 없이 둘러보기
          </button>
        </div>

        {/* 기존 아이디/비밀번호 로그인은 아주 작게 처리하거나 제거 */}
        <button 
          onClick={() => {/* 기존 로그인 폼 보여주기 토글 */}}
          className="text-sm text-gray-300 underline"
        >
          기존 아이디로 로그인
        </button>
      </div>
    </div>
  );
}
