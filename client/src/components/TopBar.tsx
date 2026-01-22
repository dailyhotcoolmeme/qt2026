import { Link, useLocation } from "wouter";
import { useDisplaySettings } from "./DisplaySettingsProvider";
import { Button } from "./ui/button";
import { Search } from "lucide-react";
import { useState } from "react"; // 추가
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function TopBar() {
  const { fontSize, increaseFontSize, decreaseFontSize, fontFamily, setFontFamily } = useDisplaySettings();
  const [, setLocation] = useLocation(); // 페이지 이동을 위해 추가
  const [tempKeyword, setTempKeyword] = useState(""); // 입력창 글자 저장용

  // 엔터를 치거나 검색 버튼을 누르면 검색 페이지로 이동!
  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempKeyword.trim()) return;
    
    // 검색어를 주소 뒤에 붙여서 보냅니다 (예: /search?q=사랑)
    setLocation(`/search?q=${encodeURIComponent(tempKeyword)}`);
    setTempKeyword(""); // 입력창 비우기
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[150] bg-white/95 backdrop-blur-lg border-b border-zinc-100 px-4 py-3 flex items-center justify-between shadow-sm">

      {/* 로고 영역 */}
      <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0">
        <div className="flex items-center gap-2">
          <img src="/icon-192.png" alt="로고" className="w-8 h-8 rounded-none" />
        </div>
      </Link>

      {/* 🔍 검색 입력칸 추가 */}
      <form onSubmit={handleQuickSearch} className="flex-1 mx-3 flex items-center bg-zinc-100 rounded-full px-3 h-8">
        <input
          type="text"
          value={tempKeyword}
          onChange={(e) => setTempKeyword(e.target.value)}
          placeholder="빠른 검색..."
          className="flex-1 bg-transparent border-none outline-none text-xs text-zinc-900 w-full"
        />
        <button type="submit">
          <Search className="w-4 h-4 text-zinc-400" />
        </button>
      </form>

      {/* 설정 영역 (폰트 조절 등) - flex-shrink-0 추가로 밀리지 않게 함 */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <div className="flex items-center bg-zinc-100 overflow-hidden rounded-sm">
          <Button variant="ghost" size="sm" onClick={decreaseFontSize} className="h-7 px-2 rounded-none hover:bg-zinc-300 text-zinc-600 font-bold text-[10px]">가-</Button>
          <Button variant="ghost" size="sm" onClick={increaseFontSize} className="h-7 px-2 rounded-none hover:bg-zinc-300 text-zinc-600 font-bold text-[10px]">가+</Button>
        </div>
        
        <Select value={fontFamily} onValueChange={(val: string) => setFontFamily(val)}>
          <SelectTrigger className="w-[70px] h-7 text-[10px] border-0 bg-zinc-100 rounded-none">
            <SelectValue /> 
          </SelectTrigger>
          <SelectContent className="z-[200]"> 
            <SelectItem value="sans-serif">고딕</SelectItem>
            <SelectItem value="serif">명조</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
