import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const handleLogin = () => {
    window.location.href = "/api/login";
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
          <Button 
            onClick={handleLogin}
            className="w-full bg-[#FEE500] hover:bg-[#FDD800] text-[#3C1E1E] font-semibold rounded-xl py-5"
            data-testid="button-kakao-login"
          >
            <LogIn className="mr-2 h-5 w-5" />
            카카오로 한 번에 가입하기
          </Button>
          <Button 
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full rounded-xl py-5"
            data-testid="button-cancel-login"
          >
            나중에 하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
