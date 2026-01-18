import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { BIBLE_BOOKS, TOTAL_CHAPTERS } from "@/lib/bibleData";

interface BibleProgress {
  id: number;
  user_id: string;
  book_name: string;
  chapter_number: number;
  is_completed: boolean;
  updated_at: string;
}

export function useBibleProgress() {
  const queryClient = useQueryClient();

  const { data: progressData = [], isLoading, refetch } = useQuery<BibleProgress[]>({
    queryKey: ['/api/bible-progress'],
    retry: false,
  });

  const readChapters = new Set(
    progressData
      .filter(p => p.is_completed)
      .map(p => `${p.book_name}:${p.chapter_number}`)
  );

  const isChapterRead = (book: string, chapter: number): boolean => {
    return readChapters.has(`${book}:${chapter}`);
  };

  const getTotalReadChapters = (): number => {
    return readChapters.size;
  };

  const getBookProgress = (bookName: string): { read: number; total: number } => {
    const book = BIBLE_BOOKS.find(b => b.name === bookName);
    if (!book) return { read: 0, total: 0 };
    
    let read = 0;
    for (let i = 1; i <= book.chapters; i++) {
      if (isChapterRead(bookName, i)) read++;
    }
    return { read, total: book.chapters };
  };

  const getOverallProgress = (): number => {
    return Math.round((getTotalReadChapters() / TOTAL_CHAPTERS) * 100);
  };

  const markMutation = useMutation({
    mutationFn: async ({ bookName, chapterNumber }: { bookName: string; chapterNumber: number }) => {
      return apiRequest('POST', '/api/bible-progress/mark', { bookName, chapterNumber });
    },
    onMutate: async ({ bookName, chapterNumber }) => {
      await queryClient.cancelQueries({ queryKey: ['/api/bible-progress'] });
      const previousProgress = queryClient.getQueryData<BibleProgress[]>(['/api/bible-progress']);
      
      queryClient.setQueryData<BibleProgress[]>(['/api/bible-progress'], old => {
        const newProgress: BibleProgress = {
          id: Date.now(),
          user_id: '',
          book_name: bookName,
          chapter_number: chapterNumber,
          is_completed: true,
          updated_at: new Date().toISOString(),
        };
        return [...(old || []), newProgress];
      });
      
      return { previousProgress };
    },
    onError: (err, variables, context) => {
      if (context?.previousProgress) {
        queryClient.setQueryData(['/api/bible-progress'], context.previousProgress);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bible-progress'] });
    },
  });

  const unmarkMutation = useMutation({
    mutationFn: async ({ bookName, chapterNumber }: { bookName: string; chapterNumber: number }) => {
      return apiRequest('POST', '/api/bible-progress/unmark', { bookName, chapterNumber });
    },
    onMutate: async ({ bookName, chapterNumber }) => {
      await queryClient.cancelQueries({ queryKey: ['/api/bible-progress'] });
      const previousProgress = queryClient.getQueryData<BibleProgress[]>(['/api/bible-progress']);
      
      queryClient.setQueryData<BibleProgress[]>(['/api/bible-progress'], old => {
        return (old || []).filter(p => !(p.book_name === bookName && p.chapter_number === chapterNumber));
      });
      
      return { previousProgress };
    },
    onError: (err, variables, context) => {
      if (context?.previousProgress) {
        queryClient.setQueryData(['/api/bible-progress'], context.previousProgress);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bible-progress'] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/bible-progress/reset', {});
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/bible-progress'], []);
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
    },
  });

  const markChapterRead = (book: string, chapter: number) => {
    markMutation.mutate({ bookName: book, chapterNumber: chapter });
  };

  const unmarkChapterRead = (book: string, chapter: number) => {
    unmarkMutation.mutate({ bookName: book, chapterNumber: chapter });
  };

  const resetProgress = () => {
    resetMutation.mutate();
  };

  return {
    progressData,
    isLoading,
    isChapterRead,
    getTotalReadChapters,
    getBookProgress,
    getOverallProgress,
    markChapterRead,
    unmarkChapterRead,
    resetProgress,
    refetch,
    isMarkPending: markMutation.isPending,
    isUnmarkPending: unmarkMutation.isPending,
    isResetPending: resetMutation.isPending,
  };
}
