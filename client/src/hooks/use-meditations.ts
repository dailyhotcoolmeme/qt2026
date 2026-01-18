import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Meditation {
  id: number;
  user_id: string;
  content: string;
  content_type: 'record' | 'prayer';
  is_public: boolean;
  is_anonymous: boolean;
  created_at: string;
  author?: string;
}

export function useMyMeditations() {
  const { data: meditations = [], isLoading, refetch } = useQuery<Meditation[]>({
    queryKey: ['/api/meditations/my'],
    retry: false,
  });

  const wordMeditations = meditations.filter(m => m.content_type === 'record');
  const prayerMeditations = meditations.filter(m => m.content_type === 'prayer');

  const groupByDate = (items: Meditation[]) => {
    const grouped: Record<string, Meditation[]> = {};
    items.forEach(m => {
      const date = new Date(m.created_at).toLocaleDateString('ko-KR');
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(m);
    });
    return Object.entries(grouped).sort((a, b) => 
      new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  };

  return {
    meditations,
    wordMeditations,
    prayerMeditations,
    isLoading,
    refetch,
    totalCount: meditations.length,
    groupByDate,
  };
}
