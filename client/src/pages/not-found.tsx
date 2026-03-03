import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";

export default function NotFound() {
  const [isAuthRedirect, setIsAuthRedirect] = useState(true);

  useEffect(() => {
    const hasAuthCode = window.location.search.includes("code=");
    const hasAuthState = window.location.search.includes("state=");
    const hasAuthToken = window.location.hash.includes("access_token");
    const hasOAuthError = window.location.search.includes("error=") || window.location.hash.includes("error=");

    if (!(hasAuthCode || hasAuthState || hasAuthToken || hasOAuthError)) {
      const timer = setTimeout(() => {
        setIsAuthRedirect(false);
      }, 500);
      return () => clearTimeout(timer);
    }

    const authTimer = setTimeout(() => {
      setIsAuthRedirect(false);
    }, 4500);
    return () => clearTimeout(authTimer);
  }, []);

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

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">페이지를 찾을 수 없습니다</h1>
          </div>
          <p className="mt-4 text-sm text-gray-600">주소가 잘못되었거나 존재하지 않는 페이지입니다.</p>
          <button
            onClick={() => {
              window.location.href = "/#/";
            }}
            className="mt-6 w-full py-3 bg-gray-900 text-white rounded-xl font-bold"
          >
            홈으로 이동하기
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
