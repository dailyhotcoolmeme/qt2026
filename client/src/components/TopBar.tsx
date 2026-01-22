import { Link, useLocation } from "wouter";
import { useDisplaySettings } from "./DisplaySettingsProvider";
import { Button } from "./ui/button";
import { Search } from "lucide-react";
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
  const [, setLocation] = useLocation();
  const [tempKeyword, setTempKeyword] = useState("");

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempKeyword.trim()) return;
    setLocation(`/search?q=${encodeURIComponent(tempKeyword)}`);
    setTempKeyword("");
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[150] bg-white/95 backdrop-blur-lg border-b border-zinc-100 px-3 py-2 flex items-center justify-between shadow-sm h-14">

      {/* 1. 로고: 최소 너비만 차지 */}
      <Link href="/" className="flex-shrink-0 mr-2">
        <img src="/icon-192.png" alt="로고" className="w-8 h-8" />
      </Link>

      {/* 2. 빠른 검색창: 크기를 적절히 제한 (max-w-[120px]) */}
      <form onSubmit={handleQuickSearch} className="flex-1 max-w-[130px] flex items-center bg-zinc-100 rounded-full px-2 h-8 mr-2">
        <input
          type="text"
          value={tempKeyword}
          onChange={(e) => setTempKeyword(e.target.value)}
          placeholder="성경 검색(키워드 입력)"
          className="flex-1 bg-transparent border-none outline-none text-[13px] text-zinc-900 w-full ml-1"
        />
        <button type="submit" className="p-1">
          <Search className="w-3.5 h-3.5 text-zinc-400" />
        </button>
      </form>

      {/* 3. 설정 영역: 가독성을 위해 크기를 키움 */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* 글자 크기 조절기 */}
        <div className="flex items-center bg-zinc-100 rounded-md overflow-hidden border border-zinc-200">
          <Button variant="ghost" size="sm" onClick={decreaseFontSize} className="h-8 px-2.5 rounded-none hover:bg-zinc-200 text-zinc-700 font-bold text-xs border-r border-zinc-200">가-</Button>
          
          {/* 현재 글자 크기 숫자 표시 (중요!) */}
          <span className="text-[13px] font-bold text-blue-600 px-2 min-w-[30px] text-center tabular-nums bg-white h-8 flex items-center justify-center">
            {fontSize}
          </span>
          
          <Button variant="ghost" size="sm" onClick={increaseFontSize} className="h-8 px-2.5 rounded-none hover:bg-zinc-200 text-zinc-700 font-bold text-xs border-l border-zinc-200">가+</Button>
        </div>
        
        {/* 글씨체 선택: 나눔체(monospace) 복구 */}
        <Select value={fontFamily} onValueChange={(val: string) => setFontFamily(val)}>
          <SelectTrigger className="w-[85px] h-8 text-[12px] border border-zinc-200 bg-white font-medium">
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
