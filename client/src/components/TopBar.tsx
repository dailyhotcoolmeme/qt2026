import { Link, useLocation } from "wouter";
import { useDisplaySettings } from "./DisplaySettingsProvider";
import { Button } from "./ui/button";
import { Search, ChevronLeft } from "lucide-react"; // 1. ChevronLeft 추가
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function TopBar() {
  const { fontSize, increaseFontSize, decreaseFontSize, fontFamily, setFontFamily } = useDisplaySettings();
  const [location, setLocation] = useLocation(); // 2. [, setLocation] 에서 [location, setLocation]으로 변경
  const [tempKeyword, setTempKeyword] = useState("");

  // 3. 현재 페이지가 검색 결과 페이지인지 본문 보기 페이지인지 확인
  const isInternalPage = location.startsWith("/search") || location.startsWith("/view");

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempKeyword.trim()) return;
    setLocation(`/search?q=${encodeURIComponent(tempKeyword)}`);
    setTempKeyword("");
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[150] bg-white/95 backdrop-blur-lg border-b border-zinc-100 px-3 py-2 flex items-center justify-between shadow-sm h-14">

      {/* 4. 조건부 로고/뒤로가기: 메인이 아닐 땐 뒤로가기 버튼 표시 */}
      {isInternalPage ? (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => window.history.back()} 
          className="flex-shrink-0 mr-2 w-8 h-8"
        >
          <ChevronLeft className="w-6 h-6 text-zinc-600" />
        </Button>
      ) : (
        <Link href="/" className="flex-shrink-0 mr-2">
          <img src="/icon-192.png" alt="로고" className="w-8 h-8" />
        </Link>
      )}

      {/* 2. 빠른 검색창 */}
      <form onSubmit={handleQuickSearch} className="flex-1 max-w-[130px] flex items-center bg-zinc-100 rounded-full px-2 h-8 mr-2">
        <input
          type="text"
          value={tempKeyword}
          onChange={(e) => setTempKeyword(e.target.value)}
          placeholder="성경 검색..."
          className="flex-1 bg-transparent border-none outline-none text-[13px] text-zinc-900 w-full ml-1"
        />
        <button type="submit" className="p-1">
          <Search className="w-3.5 h-3.5 text-zinc-400" />
        </button>
      </form>

      {/* 3. 설정 영역 */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="flex items-center bg-zinc-100 rounded-md overflow-hidden border border-zinc-200">
          <Button variant="ghost" size="sm" onClick={decreaseFontSize} className="h-8 px-2 rounded-none hover:bg-zinc-200 text-zinc-700 font-bold text-[10px] border-r border-zinc-200">가-</Button>
          
          <span className="text-[12px] font-bold text-blue-600 px-1.5 min-w-[28px] text-center tabular-nums bg-white h-8 flex items-center justify-center">
            {fontSize}
          </span>
          
          <Button variant="ghost" size="sm" onClick={increaseFontSize} className="h-8 px-2 rounded-none hover:bg-zinc-200 text-zinc-700 font-bold text-[10px] border-l border-zinc-200">가+</Button>
        </div>
        
        <Select value={fontFamily} onValueChange={(val: string) => setFontFamily(val)}>
          <SelectTrigger className="w-[75px] h-8 text-[11px] border border-zinc-200 bg-white font-medium">
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
