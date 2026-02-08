import { supabase } from '../lib/supabase';

export async function exportBibleToJson() {
  console.log('📖 성경 데이터 다운로드 시작...');
  
  const allVerses = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const start = page * pageSize;
    const end = start + pageSize - 1;
    
    console.log(`   페이지 ${page + 1} 다운로드 중... (${start}-${end})`);
    
    const { data, error } = await supabase
      .from('bible_verses')
      .select('*')
      .range(start, end)
      .order('book_id', { ascending: true })
      .order('chapter', { ascending: true })
      .order('verse', { ascending: true });

    if (error) {
      console.error('❌ 에러:', error);
      break;
    }

    if (data && data.length > 0) {
      allVerses.push(...data);
      console.log(`   ✅ ${data.length}개 추가됨 (총 ${allVerses.length}개)`);
      page++;
      
      if (data.length < pageSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  // JSON 파일로 다운로드
  const jsonStr = JSON.stringify(allVerses, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bible.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log(`\n✅ 완료! ${allVerses.length}개 절이 다운로드되었습니다.`);
  console.log(`📊 파일 크기: ${(jsonStr.length / 1024 / 1024).toFixed(2)} MB`);
  
  return allVerses;
}
