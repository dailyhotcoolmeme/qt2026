import { Link } from "wouter";
import { useDisplaySettings } from "./DisplaySettingsProvider";
import { Button } from "./ui/button";
import { Search } from "lucide-react"; // 1. 돋보기 아이콘 추가
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function TopBar() {
  const { fontSize, increaseFontSize, decreaseFontSize, fontFamily, setFontFamily } = useDisplaySettings();

  return (
    <div className="fixed top-0 left-0 right-0 z-[150] bg-white/95 backdrop-blur-lg border-b border-zinc-100 px-4 py-3 flex items-center justify-between shadow-sm">

      {/* 로고 영역 */}
      <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
        <div className="flex items-center gap-2">
          <img src="/icon-192.png" alt="로고" className="w-10 h-10 rounded-none" />
        </div>
      </Link>

      {/* 설정 및 검색 영역 */}
      <div className="flex items-center gap-2">
        
        {/* 2. 검색 페이지로 이동하는 돋보기 버튼 추가 */}
        <Link href="/search">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-zinc-100">
            <Search className="w-5 h-5 text-zinc-600" />
          </Button>
        </Link>

        {/* 구분선 (선택사항) */}
        <div className="w-[1px] h-4 bg-zinc-200 mx-1" />

        <div className="flex items-center bg-zinc-100 overflow-hidden">
          <Button variant="ghost" size="sm" onClick={decreaseFontSize} className="h-8 px-3 rounded-none hover:bg-zinc-300 text-zinc-600 font-bold text-xs">가 -</Button>
          <span className="text-xs text-zinc-500 px-1 min-w-[24px] text-center tabular-nums">{fontSize}</span>
          <Button variant="ghost" size="sm" onClick={increaseFontSize} className="h-8 px-3 rounded-none hover:bg-zinc-300 text-zinc-600 font-bold text-sm">가 +</Button>
        </div>
        
        <Select value={fontFamily} onValueChange={(val: string) => setFontFamily(val)}>
          <SelectTrigger className="w-[100px] h-8 text-xs border-0 bg-zinc-100 rounded-none">
            <SelectValue /> 
          </SelectTrigger>
          <SelectContent className="z-[200]"> 
            <SelectItem value="sans-serif">고딕체</SelectItem>
            <SelectItem value="serif">명조체</SelectItem>
            <SelectItem value="monospace">나눔체</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
