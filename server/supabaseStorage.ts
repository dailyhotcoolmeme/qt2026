import { supabase } from "./supabase";

export interface User {
  id: string;
  kakao_id?: string;
  nickname?: string;
  church?: string;
  rank?: string;
  age_group?: string;
  bible_complete_count: number;
  created_at: string;
}

export interface DailyWordComment {
  id: number;
  user_id: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  author?: string;
}

export interface Meditation {
  id: number;
  user_id: string;
  content: string;
  content_type: 'record' | 'prayer';
  is_public: boolean;
  is_anonymous: boolean;
  created_at: string;
  author?: string;
}

export interface BibleProgress {
  id: number;
  user_id: string;
  book_name: string;
  chapter_number: number;
  is_completed: boolean;
  updated_at: string;
}

export class SupabaseStorage {
  async getOrCreateUser(kakaoId: string, nickname?: string): Promise<User | null> {
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('kakao_id', kakaoId)
      .single();

    if (existing) return existing;

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({ kakao_id: kakaoId, nickname: nickname || '익명' })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return null;
    }
    return newUser;
  }

  async getUser(id: string): Promise<User | null> {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    return data;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const { data } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return data;
  }

  async getTodayWordComments(): Promise<DailyWordComment[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('daily_words_comments')
      .select(`
        *,
        users:user_id (nickname)
      `)
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      return [];
    }

    return (data || []).map(item => ({
      ...item,
      author: item.is_anonymous ? '익명' : (item.users?.nickname || '익명'),
    }));
  }

  async createWordComment(userId: string, content: string, isAnonymous: boolean): Promise<DailyWordComment | null> {
    const { data, error } = await supabase
      .from('daily_words_comments')
      .insert({ user_id: userId, content, is_anonymous: isAnonymous })
      .select()
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return null;
    }
    return data;
  }

  async getTodayMeditations(contentType?: 'record' | 'prayer'): Promise<Meditation[]> {
    const today = new Date().toISOString().split('T')[0];
    let query = supabase
      .from('meditations')
      .select(`
        *,
        users:user_id (nickname)
      `)
      .eq('is_public', true)
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`)
      .order('created_at', { ascending: false });

    if (contentType) {
      query = query.eq('content_type', contentType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching meditations:', error);
      return [];
    }

    return (data || []).map(item => ({
      ...item,
      author: item.is_anonymous ? '익명' : (item.users?.nickname || '익명'),
    }));
  }

  async getUserMeditations(userId: string): Promise<Meditation[]> {
    const { data, error } = await supabase
      .from('meditations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user meditations:', error);
      return [];
    }
    return data || [];
  }

  async createMeditation(
    userId: string,
    content: string,
    contentType: 'record' | 'prayer',
    isPublic: boolean,
    isAnonymous: boolean
  ): Promise<Meditation | null> {
    const { data, error } = await supabase
      .from('meditations')
      .insert({
        user_id: userId,
        content,
        content_type: contentType,
        is_public: isPublic,
        is_anonymous: isAnonymous,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating meditation:', error);
      return null;
    }
    return data;
  }

  async deleteMeditation(id: number, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('meditations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting meditation:', error);
      return false;
    }
    return true;
  }

  async getBibleProgress(userId: string): Promise<BibleProgress[]> {
    const { data, error } = await supabase
      .from('bible_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('is_completed', true);

    if (error) {
      console.error('Error fetching bible progress:', error);
      return [];
    }
    return data || [];
  }

  async markChapterRead(userId: string, bookName: string, chapterNumber: number): Promise<void> {
    const { error } = await supabase
      .from('bible_progress')
      .upsert({
        user_id: userId,
        book_name: bookName,
        chapter_number: chapterNumber,
        is_completed: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,book_name,chapter_number',
      });

    if (error) {
      console.error('Error marking chapter read:', error);
    }
  }

  async unmarkChapterRead(userId: string, bookName: string, chapterNumber: number): Promise<void> {
    const { error } = await supabase
      .from('bible_progress')
      .update({ is_completed: false })
      .eq('user_id', userId)
      .eq('book_name', bookName)
      .eq('chapter_number', chapterNumber);

    if (error) {
      console.error('Error unmarking chapter read:', error);
    }
  }

  async resetBibleProgress(userId: string): Promise<void> {
    const { error } = await supabase
      .from('bible_progress')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error resetting bible progress:', error);
    }
  }

  async incrementCompletionCount(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (user) {
      await supabase
        .from('users')
        .update({ bible_complete_count: (user.bible_complete_count || 0) + 1 })
        .eq('id', userId);
    }
  }
}

export const supabaseStorage = new SupabaseStorage();
