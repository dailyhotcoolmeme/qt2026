import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase 설정 (client의 .env 파일에서 가져옴)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vvgtupqjoxcyvaprrgjl.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2Z3R1cHFqb3hjeXZhcHJyZ2psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3MDQzMjAsImV4cCI6MjA1MTI4MDMyMH0.BFHPiA6xALpEXkbxFCNP0l4M-kDL_L1bFjACCi4eP-Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportBibleData() {
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

  // JSON 파일로 저장
  const outputPath = path.join(__dirname, '..', 'client', 'public', 'bible.json');
  fs.writeFileSync(outputPath, JSON.stringify(allVerses, null, 2), 'utf-8');
  
  console.log(`\n✅ 완료! ${allVerses.length}개 절이 저장되었습니다.`);
  console.log(`📁 파일 위치: ${outputPath}`);
  console.log(`📊 파일 크기: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
}

exportBibleData().catch(console.error);
