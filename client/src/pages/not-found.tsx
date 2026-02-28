import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";

export default function NotFound() {
  // 처음부터 로딩 화면을 기본값으로 설정하여 404가 번쩍이는 것을 방지합니다.
  const [isAuthRedirect, setIsAuthRedirect] = useState(true);

  useEffect(() => {
    // 주소창을 확인해서 로그인 토큰이 없다면 500ms 뒤에 진짜 404 화면으로 전환합니다.
    if (!window.location.hash.includes("access_token")) {
      const timer = setTimeout(() => {
        setIsAuthRedirect(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // 1. 로그인 처리 중이거나, 주소를 판별하는 동안 보여줄 로딩 화면
  if (isAuthRedirect) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-yellow-500 animate-spin" />
          <h1 className="text-xl font-bold text-gray-900">페이지 이동 중...</h1>
          <p className="text-sm text-gray-500">잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }

  // 2. 로그인 상황이 아님이 확실할 때만 보여주는 진짜 404 화면
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">페이지를 찾을 수 없습니다</h1>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            주소가 잘못되었거나 존재하지 않는 페이지입니다.
          </p>
          <button
            onClick={() => window.location.href = "/#/"}
            className="mt-6 w-full py-3 bg-gray-900 text-white rounded-xl font-bold"
          >
            홈으로 이동하기
          </button>
        </CardContent>
      </Card>
    </div>
  );
}