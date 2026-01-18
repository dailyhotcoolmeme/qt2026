export interface BibleBook {
  name: string;
  chapters: number;
  testament: 'old' | 'new';
}

export const BIBLE_BOOKS: BibleBook[] = [
  { name: "창세기", chapters: 50, testament: "old" },
  { name: "출애굽기", chapters: 40, testament: "old" },
  { name: "레위기", chapters: 27, testament: "old" },
  { name: "민수기", chapters: 36, testament: "old" },
  { name: "신명기", chapters: 34, testament: "old" },
  { name: "여호수아", chapters: 24, testament: "old" },
  { name: "사사기", chapters: 21, testament: "old" },
  { name: "룻기", chapters: 4, testament: "old" },
  { name: "사무엘상", chapters: 31, testament: "old" },
  { name: "사무엘하", chapters: 24, testament: "old" },
  { name: "열왕기상", chapters: 22, testament: "old" },
  { name: "열왕기하", chapters: 25, testament: "old" },
  { name: "역대상", chapters: 29, testament: "old" },
  { name: "역대하", chapters: 36, testament: "old" },
  { name: "에스라", chapters: 10, testament: "old" },
  { name: "느헤미야", chapters: 13, testament: "old" },
  { name: "에스더", chapters: 10, testament: "old" },
  { name: "욥기", chapters: 42, testament: "old" },
  { name: "시편", chapters: 150, testament: "old" },
  { name: "잠언", chapters: 31, testament: "old" },
  { name: "전도서", chapters: 12, testament: "old" },
  { name: "아가", chapters: 8, testament: "old" },
  { name: "이사야", chapters: 66, testament: "old" },
  { name: "예레미야", chapters: 52, testament: "old" },
  { name: "예레미야애가", chapters: 5, testament: "old" },
  { name: "에스겔", chapters: 48, testament: "old" },
  { name: "다니엘", chapters: 12, testament: "old" },
  { name: "호세아", chapters: 14, testament: "old" },
  { name: "요엘", chapters: 3, testament: "old" },
  { name: "아모스", chapters: 9, testament: "old" },
  { name: "오바댜", chapters: 1, testament: "old" },
  { name: "요나", chapters: 4, testament: "old" },
  { name: "미가", chapters: 7, testament: "old" },
  { name: "나훔", chapters: 3, testament: "old" },
  { name: "하박국", chapters: 3, testament: "old" },
  { name: "스바냐", chapters: 3, testament: "old" },
  { name: "학개", chapters: 2, testament: "old" },
  { name: "스가랴", chapters: 14, testament: "old" },
  { name: "말라기", chapters: 4, testament: "old" },
  { name: "마태복음", chapters: 28, testament: "new" },
  { name: "마가복음", chapters: 16, testament: "new" },
  { name: "누가복음", chapters: 24, testament: "new" },
  { name: "요한복음", chapters: 21, testament: "new" },
  { name: "사도행전", chapters: 28, testament: "new" },
  { name: "로마서", chapters: 16, testament: "new" },
  { name: "고린도전서", chapters: 16, testament: "new" },
  { name: "고린도후서", chapters: 13, testament: "new" },
  { name: "갈라디아서", chapters: 6, testament: "new" },
  { name: "에베소서", chapters: 6, testament: "new" },
  { name: "빌립보서", chapters: 4, testament: "new" },
  { name: "골로새서", chapters: 4, testament: "new" },
  { name: "데살로니가전서", chapters: 5, testament: "new" },
  { name: "데살로니가후서", chapters: 3, testament: "new" },
  { name: "디모데전서", chapters: 6, testament: "new" },
  { name: "디모데후서", chapters: 4, testament: "new" },
  { name: "디도서", chapters: 3, testament: "new" },
  { name: "빌레몬서", chapters: 1, testament: "new" },
  { name: "히브리서", chapters: 13, testament: "new" },
  { name: "야고보서", chapters: 5, testament: "new" },
  { name: "베드로전서", chapters: 5, testament: "new" },
  { name: "베드로후서", chapters: 3, testament: "new" },
  { name: "요한일서", chapters: 5, testament: "new" },
  { name: "요한이서", chapters: 1, testament: "new" },
  { name: "요한삼서", chapters: 1, testament: "new" },
  { name: "유다서", chapters: 1, testament: "new" },
  { name: "요한계시록", chapters: 22, testament: "new" },
];

export const OLD_TESTAMENT = BIBLE_BOOKS.filter(b => b.testament === 'old');
export const NEW_TESTAMENT = BIBLE_BOOKS.filter(b => b.testament === 'new');

export const TOTAL_CHAPTERS = BIBLE_BOOKS.reduce((sum, b) => sum + b.chapters, 0);
export const CHAPTERS_PER_DAY = Math.ceil(TOTAL_CHAPTERS / 365);

export function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export function getTodayReadingPlan(): { book: string; startChapter: number; endChapter: number }[] {
  const dayOfYear = getDayOfYear();
  const startChapter = (dayOfYear - 1) * CHAPTERS_PER_DAY + 1;
  const endChapter = dayOfYear * CHAPTERS_PER_DAY;
  
  const result: { book: string; startChapter: number; endChapter: number }[] = [];
  let chapterCount = 0;
  
  for (const book of BIBLE_BOOKS) {
    const bookStart = chapterCount + 1;
    const bookEnd = chapterCount + book.chapters;
    
    if (bookEnd >= startChapter && bookStart <= endChapter) {
      const readStart = Math.max(1, startChapter - chapterCount);
      const readEnd = Math.min(book.chapters, endChapter - chapterCount);
      result.push({ book: book.name, startChapter: readStart, endChapter: readEnd });
    }
    
    chapterCount += book.chapters;
    if (chapterCount >= endChapter) break;
  }
  
  return result;
}
