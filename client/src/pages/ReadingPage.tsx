// ReadingPage 내부의 본문 렌더링 부분 예시
<div className="flex-1 overflow-y-auto p-4 space-y-4">
  {verses.map((v) => (
    <div key={v.id} className="flex gap-3 text-lg">
      <span className="text-[#7180B9] font-bold min-w-[20px]">{v.verse}</span>
      <p className="text-gray-800 leading-relaxed">{v.content}</p>
    </div>
  ))}
</div>

{/* 하단 메모장 영역 */}
<div className="h-40 bg-gray-50 border-t p-4 shadow-inner">
  <textarea 
    className="w-full h-full bg-transparent outline-none resize-none"
    placeholder="오늘 말씀을 읽으며 느낀 점을 기록해보세요..."
  />
</div>
