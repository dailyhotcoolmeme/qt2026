import React, { useMemo, useState, useEffect, useRef } from "react";
import { 
  Headphones, Share2, Copy, Bookmark, 
  Play, Pause, X, Calendar as CalendarIcon, Heart, Mic, Square
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase"; 
import { useDisplaySettings } from "../components/DisplaySettingsProvider";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";
import { LoginModal } from "../components/LoginModal";
import { BibleAudioPlayerModal } from "../components/BibleAudioPlayerModal";
import {
  getCachedAudioObjectUrl,
  parseVerseRange,
  parseVerses,
} from "../lib/bibleAudio";
import confetti from "canvas-confetti";
import { uploadFileToR2 } from "../utils/upload";
import { fetchMyGroups, linkPersonalActivityToGroup } from "../lib/group-activity";

export default function QTPage() {
  const [location, setLocation] = useLocation(); 
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  // 사용자 관련 상태
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 성경 및 UI 관련 상태
  const [bibleData, setBibleData] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDurationUi, setAudioDurationUi] = useState(0);
  const [audioCurrentVerse, setAudioCurrentVerse] = useState<number | null>(null);
  const [audioSubtitle, setAudioSubtitle] = useState("");
  const [autoFollowEnabled, setAutoFollowEnabled] = useState(true);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [isMeditationCompleted, setIsMeditationCompleted] = useState(false);

  // 묵상 기록 관련 상태
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [showWriteSheet, setShowWriteSheet] = useState(false);
  const [meditationText, setMeditationText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [meditationRecords, setMeditationRecords] = useState<any[]>([]);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState<number | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [myGroups, setMyGroups] = useState<{ id: string; name: string }[]>([]);
  const [showGroupLinkPrompt, setShowGroupLinkPrompt] = useState(false);
  const [showGroupLinkModal, setShowGroupLinkModal] = useState(false);
  const [pendingGroupLinkSourceRowId, setPendingGroupLinkSourceRowId] = useState<string | null>(null);
  const [linkingGroupId, setLinkingGroupId] = useState<string | null>(null);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioEndMsRef = useRef<number | null>(null);
  const audioMetaRef = useRef<any | null>(null);
  const audioVerseStartRef = useRef<number | null>(null);
  const audioVerseEndRef = useRef<number | null>(null);
  const audioObjectUrlRef = useRef<string | null>(null);
  const scrollResumeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const verseContainerRef = useRef<HTMLDivElement | null>(null);
  const verseRowRefs = useRef<Record<number, HTMLParagraphElement | null>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordAudioRef = useRef<HTMLAudioElement | null>(null);

  // 오디오 컨트롤 표시 상태 (TTS 재생용)
  const [showAudioControl, setShowAudioControl] = useState(false);

  const { fontSize = 16 } = useDisplaySettings();

  // currentDate가 변경될 때 말씀 가져오기
  useEffect(() => {
    fetchVerse();
  }, [currentDate]);

  // user나 currentDate가 변경될 때 묵상 완료 상태 확인
  useEffect(() => {
    checkMeditationStatus();
    loadMeditationRecords();
  }, [user?.id, currentDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = new Date(e.target.value);
    if (!isNaN(selectedDate.getTime())) {
      if (selectedDate > today) {
        alert("오늘 이후의 말씀은 미리 볼 수 없습니다.");
        return;
      }
      setCurrentDate(selectedDate);
    }
  };

  // 묵상 완료 상태 확인
  const checkMeditationStatus = async () => {
    if (!user?.id) {
      setIsMeditationCompleted(false);
      return;
    }

    const formattedDate = currentDate.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('user_meditation_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', formattedDate)
      .eq('meditation_type', 'daily_qt');

    if (error) {
      console.error('Error checking meditation status:', error);
      return;
    }

    setIsMeditationCompleted(data && data.length > 0);
  };

  // 묵상 기록 목록 불러오기 (텍스트나 음성이 있는 것만)
  const loadMeditationRecords = async () => {
    if (!user?.id) {
      setMeditationRecords([]);
      return;
    }

    const formattedDate = currentDate.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('user_meditation_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', formattedDate)
      .eq('meditation_type', 'daily_qt')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading meditation records:', error);
      return;
    }

    // 텍스트나 음성이 있는 기록만 필터링
    const recordsWithContent = (data || []).filter(
      record => record.meditation_text || record.audio_url
    );
    setMeditationRecords(recordsWithContent);
  };



  // 묵상 완료 버튼 클릭
  const handleMeditationComplete = async () => {
    if (!user?.id) {
      setShowLoginModal(true);
      return;
    }

    // 당일만 활성화
    const isToday = currentDate.toDateString() === today.toDateString();
    if (!isToday) {
      return; // 과거 날짜는 클릭 불가
    }

    if (!isMeditationCompleted) {
      // 확인 모달 표시
      setShowConfirmModal(true);
    } else {
      // 완료 상태일 때 취소 모달 표시
      setShowCancelConfirmModal(true);
    }
  };

  // 묵상 완료 취소
  const handleCancelMeditation = async () => {
    const formattedDate = currentDate.toISOString().split('T')[0];
    
    try {
      // 해당 날짜의 모든 레코드 찾기
      const recordsToDelete = meditationRecords.filter(
        record => record.date === formattedDate
      );

      // 각 레코드의 음성 파일 삭제
      for (const record of recordsToDelete) {
        if (record.audio_url) {
          try {
            await fetch('/api/audio/delete', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileUrl: record.audio_url })
            });
          } catch (error) {
            console.error('[R2 삭제] 오류:', error);
          }
        }
      }

      // DB에서 해당 날짜의 모든 레코드 삭제
      const { error } = await supabase
        .from('user_meditation_records')
        .delete()
        .eq('user_id', user!.id)
        .eq('date', formattedDate);

      if (error) throw error;

      setIsMeditationCompleted(false);
      setShowCancelConfirmModal(false);
      await loadMeditationRecords();
      
      if (window.navigator?.vibrate) window.navigator.vibrate([30, 30]);
    } catch (error) {
      console.error('Error canceling meditation:', error);
      alert('묵상 완료 취소 중 오류가 발생했습니다.');
    }
  };

  // 묵상 완료만 체크 (기록 없이)
  const handleCompleteOnly = async () => {
    if (!user?.id) {
      setShowLoginModal(true);
      return;
    }
    const formattedDate = currentDate.toISOString().split('T')[0];
    
    try {
      const { data: inserted, error } = await supabase
        .from('user_meditation_records')
        .insert({
          user_id: user.id,
          date: formattedDate,
          meditation_type: 'daily_qt',
          book_name: bibleData?.bible_name || null,
          chapter: bibleData?.chapter || null,
          verse: bibleData?.verse || null
        })
        .select('id')
        .single();

      if (error) throw error;
      if (!inserted?.id) throw new Error("QT 기록 저장 ID를 찾을 수 없습니다.");

      setIsMeditationCompleted(true);
      setShowConfirmModal(false);
      await prepareQtGroupLink(String(inserted.id));

      if (window.navigator?.vibrate) window.navigator.vibrate(30);
    } catch (error) {
      console.error('Error completing meditation:', error);
      alert('묵상 완료 중 오류가 발생했습니다.');
    }
  };

  const prepareQtGroupLink = async (sourceRowId: string) => {
    if (!user?.id) return;

    const groups = await fetchMyGroups(user.id);
    if (groups.length === 0) return;

    setMyGroups(groups);
    setPendingGroupLinkSourceRowId(sourceRowId);
    setShowGroupLinkPrompt(true);
  };

  const closeQtGroupLinkFlow = () => {
    setShowGroupLinkPrompt(false);
    setShowGroupLinkModal(false);
    setPendingGroupLinkSourceRowId(null);
    setLinkingGroupId(null);
  };

  const handleQtGroupLink = async (groupId: string) => {
    if (!user?.id || !pendingGroupLinkSourceRowId) return;
    setLinkingGroupId(groupId);

    try {
      const { error } = await linkPersonalActivityToGroup({
        userId: user.id,
        activityType: "qt",
        sourceTable: "user_meditation_records",
        sourceRowId: pendingGroupLinkSourceRowId,
        groupId,
      });

      if (error) throw error;
      closeQtGroupLinkFlow();
      alert("모임 신앙생활에 연결되었습니다.");
    } catch (error) {
      console.error("qt group link failed:", error);
      alert("모임 연결에 실패했습니다.");
    } finally {
      setLinkingGroupId(null);
    }
  };

  // 음성 녹음 시작
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 48000
      });
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // 녹음 시간 카운터
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('마이크 권한이 필요합니다.');
    }
  };

  // 음성 녹음 중지
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 음성 삭제
  const deleteAudio = () => {
    setAudioBlob(null);
    setRecordingTime(0);
  };

  // 묵상 기록 저장
  const handleSubmitMeditation = async () => {
    if (!user?.id) {
      setShowLoginModal(true);
      return;
    }

    if (!meditationText && !audioBlob) {
      alert('묵상 기록을 입력하거나 음성을 녹음해주세요.');
      return;
    }

    const formattedDate = currentDate.toISOString().split('T')[0];
    const kstDate = new Date(currentDate.getTime() + (9 * 60 * 60 * 1000)).toISOString().split('T')[0];
    let audioUrl: string | null = null;

    try {
      // 음성 파일이 있으면 R2에 업로드
      if (audioBlob) {
        const timestamp = Date.now();
        const fileName = `audio/meditation/${user.id}/${kstDate}/qt_${timestamp}.webm`;
        
        // Blob을 File로 변환
        const audioFile = new File([audioBlob], `qt_${timestamp}.webm`, { type: 'audio/webm' });
        
        // R2 업로드 (기존 함수 활용, 경로만 전달)
        const response = await fetch('/api/audio/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName,
            audioBase64: await blobToBase64(audioBlob)
          })
        });

        if (!response.ok) throw new Error('음성 업로드 실패');
        
        const { publicUrl } = await response.json();
        audioUrl = publicUrl;
      }

      // DB에 저장
      const { data: inserted, error } = await supabase
        .from('user_meditation_records')
        .insert({
          user_id: user.id,
          date: formattedDate,
          meditation_type: 'daily_qt',
          book_name: bibleData?.bible_name || null,
          chapter: bibleData?.chapter || null,
          verse: bibleData?.verse || null,
          meditation_text: meditationText || null,
          audio_url: audioUrl,
          audio_duration: recordingTime
        })
        .select('id')
        .single();

      if (error) throw error;
      if (!inserted?.id) throw new Error("QT 기록 저장 ID를 찾을 수 없습니다.");

      setIsMeditationCompleted(true);
      setShowWriteSheet(false);
      setShowConfirmModal(false);
      setEditingRecord(null);
      setMeditationText('');
      setAudioBlob(null);
      setRecordingTime(0);
      
      // 기록 목록 새로고침
      await loadMeditationRecords();
      await prepareQtGroupLink(String(inserted.id));

      if (window.navigator?.vibrate) window.navigator.vibrate(30);
    } catch (error) {
      console.error('Error saving meditation:', error);
      alert('묵상 기록 저장 중 오류가 발생했습니다.');
    }
  };

  // 기록 수정 시작
  const startEditRecord = (record: any) => {
    setEditingRecord(record);
    setMeditationText(record.meditation_text || '');
    setAudioBlob(null); // 기존 음성은 URL로 관리
    setRecordingTime(record.audio_duration || 0);
    setShowWriteSheet(true);
  };

  // 기록 수정 저장
  const handleUpdateMeditation = async () => {
    if (!meditationText && !audioBlob && !editingRecord.audio_url) {
      alert('묵상 기록을 입력하거나 음성을 녹음해주세요.');
      return;
    }

    let audioUrl = editingRecord.audio_url;

    try {
      // 새 음성 파일이 있으면 업로드
      if (audioBlob) {
        const kstDate = new Date(currentDate.getTime() + (9 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const timestamp = Date.now();
        const fileName = `audio/meditation/${user!.id}/${kstDate}/qt_${timestamp}.webm`;
        
        const response = await fetch('/api/audio/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName,
            audioBase64: await blobToBase64(audioBlob)
          })
        });

        if (!response.ok) throw new Error('음성 업로드 실패');
        
        const { publicUrl } = await response.json();
        audioUrl = publicUrl;
      }

      // DB 업데이트
      const { error } = await supabase
        .from('user_meditation_records')
        .update({
          meditation_text: meditationText || null,
          audio_url: audioUrl,
          audio_duration: audioBlob ? recordingTime : editingRecord.audio_duration,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingRecord.id);

      if (error) throw error;

      setShowWriteSheet(false);
      setEditingRecord(null);
      setMeditationText('');
      setAudioBlob(null);
      setRecordingTime(0);
      
      await loadMeditationRecords();
      
      if (window.navigator?.vibrate) window.navigator.vibrate(30);
    } catch (error) {
      console.error('Error updating meditation:', error);
      alert('묵상 기록 수정 중 오류가 발생했습니다.');
    }
  };

  // 기록 삭제 확인
  const confirmDeleteRecord = (recordId: number) => {
    setDeletingRecordId(recordId);
    setShowDeleteConfirm(true);
  };

  // 기록 삭제 실행
  const handleDeleteRecord = async () => {
    if (!deletingRecordId) return;

    try {
      // 삭제할 레코드 찾기
      const recordToDelete = meditationRecords.find(r => r.id === deletingRecordId);
      
      // R2 파일 삭제 (음성이 있는 경우)
      if (recordToDelete?.audio_url) {
        try {
          console.log('[R2 삭제] 시작:', recordToDelete.audio_url);
          
          const response = await fetch('/api/audio/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileUrl: recordToDelete.audio_url })
          });
          
          console.log('[R2 삭제] 응답 상태:', response.status, response.statusText);
          
          const result = await response.json();
          console.log('[R2 삭제] 결과:', result);
          
          if (!response.ok || !result.success) {
            console.error('[R2 삭제] 실패:', result.error);
            console.warn('DB는 삭제 진행');
          } else {
            console.log('[R2 삭제] 성공:', recordToDelete.audio_url);
          }
        } catch (error) {
          console.error('[R2 삭제] 오류:', error);
          // R2 삭제 실패해도 DB 삭제는 진행
        }
      }

      // DB에서 삭제
      const { error } = await supabase
        .from('user_meditation_records')
        .delete()
        .eq('id', deletingRecordId);

      if (error) throw error;

      setShowDeleteConfirm(false);
      setDeletingRecordId(null);
      await loadMeditationRecords();
      await checkMeditationStatus();
      
      if (window.navigator?.vibrate) window.navigator.vibrate([30, 30]);
    } catch (error) {
      console.error('Error deleting meditation:', error);
      alert('묵상 기록 삭제 중 오류가 발생했습니다.');
    }
  };

  // 음성 재생
  const playRecordAudio = (audioUrl: string, recordId: number) => {
    if (playingAudioId === recordId && recordAudioRef.current) {
      recordAudioRef.current.pause();
      setPlayingAudioId(null);
      return;
    }

    if (recordAudioRef.current) {
      recordAudioRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    recordAudioRef.current = audio;
    setPlayingAudioId(recordId);
    setAudioProgress(0);

    audio.addEventListener('loadedmetadata', () => {
      setAudioDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      setAudioProgress(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setPlayingAudioId(null);
      setAudioProgress(0);
    });

    audio.play();
  };

  // 음성 진행바 클릭
  const seekAudio = (progress: number) => {
    if (recordAudioRef.current) {
      recordAudioRef.current.currentTime = progress;
    }
  };

  // 기존 음성 삭제 (수정 모달에서)
  const deleteExistingAudio = async () => {
    if (!editingRecord) return;

    try {
      const { error } = await supabase
        .from('user_meditation_records')
        .update({
          audio_url: null,
          audio_duration: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingRecord.id);

      if (error) throw error;

      setEditingRecord({ ...editingRecord, audio_url: null, audio_duration: 0 });
      await loadMeditationRecords();
    } catch (error) {
      console.error('Error deleting audio:', error);
      alert('음성 삭제 중 오류가 발생했습니다.');
    }
  };

  // Blob을 Base64로 변환
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // 녹음 시간 포맷팅
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    fetchVerse();
  }, [currentDate]);
  
  const fetchVerse = async () => {
  const formattedDate = currentDate.toISOString().split('T')[0];
  
  // 1. 오늘의 말씀 가져오기
  const { data: verse } = await supabase
    .from('daily_qt_verses')
    .select('*')
    .eq('display_date', formattedDate)
    .maybeSingle();
  
  if (verse) {
    // 2. 중요: bible_books 테이블에서 해당 성경의 순서(book_order)를 가져옴
    const { data: book } = await supabase
      .from('bible_books')
      .select('book_order')
      .eq('book_name', verse.bible_name) // bible_name으로 매칭
      .maybeSingle();

    // 3. bible_books 데이터를 포함해서 상태 업데이트
    setBibleData({ ...verse, bible_books: book });
  }
};

  const cleanContent = (text: string) => {
    if (!text) return "";
    return text
      .replace(/^[.\s]+/, "") 
      .replace(/\d+절/g, "")
      .replace(/\d+/g, "")
      .replace(/[."'“”‘’]/g, "")
      .replace(/\.$/, "")
      .trim();
  };

  const handleCopy = () => {
  if (bibleData) {
    // 실제 복사 로직
    navigator.clipboard.writeText(cleanContent(bibleData.content));
    
    // 토스트 켜고 2초 뒤 끄기
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
    
    // 햅틱 반응 (선택)
    if (window.navigator?.vibrate) window.navigator.vibrate(20);
  }
};
const handleShare = async () => {
  if (window.navigator?.vibrate) window.navigator.vibrate(20);

  const shareDate = bibleData?.display_date;
  const shareUrl = shareDate
    ? `${window.location.origin}/?date=${shareDate}#/qt`
    : window.location.href;

  const shareData = {
    title: '성경 말씀',
    text: bibleData?.content
      ? cleanContent(bibleData.content)
      : '말씀을 공유해요.',
    url: shareUrl,
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert("링크가 클립보드에 복사되었습니다.");
    }
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error("공유 실패:", error);
    }
  }
};

const handleBookmark = async () => {
  if (!bibleData) return;
  if (!user?.id) {
    setShowLoginModal(true);
    return;
  }

  const verseRef = `${bibleData.bible_name} ${bibleData.chapter}${bibleData.bible_name === '시편' ? '편' : '장'} ${bibleData.verse}절`;
  const { error } = await supabase.from("verse_bookmarks").insert({
    user_id: user.id,
    source: "qt",
    verse_ref: verseRef,
    content: cleanContent(bibleData.content),
    memo: null,
  });

  if (error) {
    if (error.code === "23505") {
      alert("이미 저장한 말씀입니다.");
      return;
    }
    alert("기록함 저장에 실패했습니다.");
    return;
  }

  alert("기록함에 저장되었습니다.");
};
  
// 1. 재생/일시정지 토글
  const parsedVerses = useMemo(() => parseVerses(bibleData?.content || ""), [bibleData?.content]);

  const markUserScroll = () => {
    setAutoFollowEnabled(false);
    if (scrollResumeTimerRef.current) clearTimeout(scrollResumeTimerRef.current);
    scrollResumeTimerRef.current = setTimeout(() => setAutoFollowEnabled(true), 900);
  };

  const focusVerseRow = (verse: number | null, smooth = true) => {
    if (!verse || !autoFollowEnabled) return;
    const row = verseRowRefs.current[verse];
    row?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
  };

  useEffect(() => {
    if (autoFollowEnabled) focusVerseRow(audioCurrentVerse, true);
  }, [audioCurrentVerse, autoFollowEnabled]);

  useEffect(() => {
    return () => {
      if (audioObjectUrlRef.current) {
        URL.revokeObjectURL(audioObjectUrlRef.current);
        audioObjectUrlRef.current = null;
      }
      if (scrollResumeTimerRef.current) clearTimeout(scrollResumeTimerRef.current);
    };
  }, []);

  const closeAudioModal = () => {
    if (audioRef.current) audioRef.current.pause();
    setIsPlaying(false);
    setShowAudioControl(false);
    setAudioLoading(false);
    setAudioCurrentTime(0);
    setAudioDurationUi(0);
    audioEndMsRef.current = null;
  };

  const togglePlay = () => {
    if (!audioRef.current || audioLoading) return;
    if (audioRef.current.paused) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeekAudio = (nextSeconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = nextSeconds;
    setAudioCurrentTime(nextSeconds);
  };

  const getPlayableVerseNumbers = () => {
    const minVerse = audioVerseStartRef.current ?? 1;
    const maxVerse = audioVerseEndRef.current ?? Number.MAX_SAFE_INTEGER;
    const fromText = parsedVerses
      .map((v) => v.verse)
      .filter((v) => v >= minVerse && v <= maxVerse);
    if (fromText.length > 0) return fromText;
    const fromMeta = (audioMetaRef.current?.verses || [])
      .map((v: any) => Number(v.verse))
      .filter((v: number) => Number.isFinite(v) && v >= minVerse && v <= maxVerse);
    return fromMeta;
  };

  const estimateCurrentVerseByProgress = () => {
    const verses = getPlayableVerseNumbers();
    if (!verses.length || !audioRef.current) return null;
    const dur = audioRef.current.duration || audioDurationUi || 0;
    if (!dur || dur <= 0) return verses[0];
    const ratio = Math.max(0, Math.min(0.999, audioRef.current.currentTime / dur));
    const idx = Math.min(verses.length - 1, Math.floor(ratio * verses.length));
    return verses[idx];
  };

  const seekToVerse = (targetVerse: number) => {
    const meta = audioMetaRef.current;
    if (!audioRef.current) return;
    const rows = meta?.verses || [];
    const row =
      rows.find((v: any) => v.verse === targetVerse) ??
      rows.find((v: any) => v.verse > targetVerse) ??
      [...rows].reverse().find((v: any) => v.verse < targetVerse) ??
      null;
    if (row && Number.isFinite(row.start_ms)) {
      const sec = Math.max(0, row.start_ms / 1000);
      audioRef.current.currentTime = sec;
      setAudioCurrentTime(sec);
      setAudioCurrentVerse(Number(row.verse));
      return;
    }

    const verses = getPlayableVerseNumbers();
    if (!verses.length) return;
    const foundIdx = verses.findIndex((v) => v >= targetVerse);
    const targetIdx = foundIdx === -1 ? verses.length - 1 : foundIdx;
    const dur = audioRef.current.duration || audioDurationUi || 0;
    if (dur > 0) {
      const sec = (targetIdx / Math.max(1, verses.length)) * dur;
      audioRef.current.currentTime = sec;
      setAudioCurrentTime(sec);
    }
    setAudioCurrentVerse(verses[targetIdx]);
  };

  const jumpPrevVerse = () => {
    const current = audioCurrentVerse ?? estimateCurrentVerseByProgress();
    const minVerse = audioVerseStartRef.current ?? 1;
    if (!current) return;
    const next = Math.max(minVerse, current - 1);
    seekToVerse(next);
  };

  const jumpNextVerse = () => {
    const current = audioCurrentVerse ?? estimateCurrentVerseByProgress();
    const maxVerse = audioVerseEndRef.current ?? Number.MAX_SAFE_INTEGER;
    if (!current) return;
    const next = Math.min(maxVerse, current + 1);
    seekToVerse(next);
  };

  const handlePlayTTS = async () => {
    if (!bibleData) return;
    if (!user?.id) {
      setShowLoginModal(true);
      return;
    }

    const bookId = Number(bibleData?.bible_books?.book_order || 0);
    const chapter = Number(bibleData?.chapter || 0);
    if (!bookId || !chapter) return;

    if (window.navigator?.vibrate) window.navigator.vibrate(20);

    try {
      setShowAudioControl(true);
      setAudioLoading(true);
      setAudioSubtitle("\uC624\uB514\uC624 \uC900\uBE44 \uC911...");

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }

      const verseRange = parseVerseRange(bibleData?.verse);
      const plainText = parsedVerses.length
        ? parsedVerses.map((v) => v.text).join(" ")
        : String(bibleData?.content || "")
            .replace(/\s+/g, " ")
            .replace(/\d+\.?\s*/g, " ")
            .trim();
      const keyParts = [
        String(bibleData?.date || currentDate.toISOString().slice(0, 10)),
        `b${String(bookId).padStart(3, "0")}`,
        `c${String(chapter).padStart(3, "0")}`,
        verseRange ? `v${verseRange.start}-${verseRange.end}` : "vall",
      ];
      const cacheKey = keyParts.join("_");
      const ttsRes = await fetch("/api/tts/naver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: plainText,
          cacheKey,
        }),
      });
      if (!ttsRes.ok) {
        const errText = await ttsRes.text();
        throw new Error(`naver tts api failed: ${ttsRes.status} ${errText}`);
      }
      const ttsPayload = await ttsRes.json();
      if (!ttsPayload?.audio_url) throw new Error("audio url missing from tts api");

      audioMetaRef.current = { verses: [] };
      const audioUrl = await getCachedAudioObjectUrl(ttsPayload.audio_url);
      if (audioObjectUrlRef.current?.startsWith("blob:")) URL.revokeObjectURL(audioObjectUrlRef.current);
      audioObjectUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audio.preload = "auto";
      audioRef.current = audio;

      audioEndMsRef.current = null;
      const verseNumbers = parsedVerses.map((v) => v.verse).filter((v) => Number.isFinite(v));
      const firstVerse = verseNumbers.length ? Math.min(...verseNumbers) : 1;
      const lastVerse = verseNumbers.length ? Math.max(...verseNumbers) : Number.MAX_SAFE_INTEGER;
      audioVerseStartRef.current = verseRange?.start ?? firstVerse;
      audioVerseEndRef.current = verseRange?.end ?? lastVerse;

      setAudioSubtitle(
        verseRange
          ? `${bibleData.bible_name} ${chapter}\uC7A5 ${verseRange.start}-${verseRange.end}\uC808`
          : `${bibleData.bible_name} ${chapter}\uC7A5${ttsPayload?.cached ? " (R2)" : " (new)"}`
      );

      audio.onloadedmetadata = () => {
        setAudioDurationUi(audio.duration || 0);
        audio.currentTime = 0;
      };

      audio.ontimeupdate = () => {
        setAudioCurrentTime(audio.currentTime);
        setAudioCurrentVerse(estimateCurrentVerseByProgress());
      };

      audio.onended = () => {
        setIsPlaying(false);
      };

      await audio.play();
      setIsPlaying(true);
      setAudioLoading(false);
    } catch (error) {
      console.error("QT audio play failed:", error);
      setAudioLoading(false);
      setIsPlaying(false);
      setAudioSubtitle("\uC624\uB514\uC624\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    }
  };
const onDragEnd = (event: any, info: any) => {
    if (info.offset.x > 100) { // 이전 날짜
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    } else if (info.offset.x < -100) { // 다음 날짜
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      if (d <= today) setCurrentDate(d);
    }
  };

  return (
    <div className="flex flex-col items-center w-full min-h-full bg-[#F8F8F8] overflow-y-auto overflow-x-hidden pt-24 pb-4 px-4">
      
      {/* 상단 날짜 영역 */}
            <header className="text-center mb-3 flex flex-col items-center w-full relative">
              <p className="font-bold text-gray-400 tracking-[0.2em] mb-1" style={{ fontSize: `${fontSize * 0.8}px` }}>
                {currentDate.getFullYear()}
              </p>
               {/* 날짜 정렬 영역 */}
              <div className="flex items-center justify-center w-full">
              {/* 1. 왼쪽 공간 확보용 (달력 버튼 포함) */}
          <div className="flex-1 flex justify-end pr-3">
            <button 
              onClick={() => dateInputRef.current?.showPicker()} 
              className="p-1.5 rounded-full bg-white shadow-sm border border-zinc-100 text-[#4A6741] active:scale-95 transition-transform"
            >
              <CalendarIcon size={16} strokeWidth={1.5} />
            </button>
          </div>
          {/* 2. 중앙 날짜 (고정석) */}
          <h2 className="font-black text-zinc-900 tracking-tighter shrink-0" style={{ fontSize: `${fontSize * 1.25}px` }}>
            {currentDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </h2>
           {/* 3. 오른쪽: 가상의 빈 공간 (연필 버튼과 똑같은 너비를 확보하여 날짜를 중앙으로 밀어줌) */}
    <div className="flex-1 flex justify-start pl-3">
      {/* 아이콘이 없더라도 버튼과 똑같은 크기(w-[32px] h-[32px])의 
          투명한 박스를 두어 왼쪽 버튼과 무게 중심을 맞춥니다. 
      */}
      <div className="w-[28px] h-[28px]" aria-hidden="true" />
    </div>
    {/* 숨겨진 날짜 입력 input */}
    <input 
      type="date"
      ref={dateInputRef}
      onChange={handleDateChange}
      max={new Date().toISOString().split("T")[0]} 
      className="absolute opacity-0 pointer-events-none"
    />
  </div>
</header>

      {/* 2. 말씀 카드 (양옆 힌트 카드 디자인 복구) */}
      <div className="relative w-full flex-1 flex items-center justify-center py-4 overflow-visible">
  
  {/* 왼쪽 힌트 카드 (어제) */}
<div className="absolute left-[-75%] w-[82%] max-w-sm h-[450px] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
  
  <AnimatePresence mode="wait">
  <motion.div 
    key={currentDate.toISOString()}
    drag="x" 
    dragConstraints={{ left: 0, right: 0 }}
    dragElastic={0.2}
    onDragEnd={onDragEnd}
    initial={{ opacity: 0, x: 20 }} 
    animate={{ opacity: 1, x: 0 }} 
    exit={{ opacity: 0, x: -20 }}
    className="w-[82%] max-w-sm h-auto min-h-[450px] bg-white rounded-[32px] shadow-[0_15px_45px_rgba(0,0,0,0.06)] border border-white flex flex-col items-start justify-center px-8 py-6 text-left z-10 touch-none cursor-grab active:cursor-grabbing"
  >
    {bibleData ? (
      <>
        {/* 출처 영역 - 상단으로 이동 */}
        <span className="self-center text-center font-bold text-[#4A6741] opacity-60 mb-6" style={{ fontSize: `${fontSize * 0.9}px` }}>
          {bibleData.bible_name} {bibleData.chapter}{bibleData.bible_name === '시편' ? '편' : '장'} {bibleData.verse}절
        </span>

        {/* 말씀 본문 영역 - 높이 고정 및 스크롤 추가 */}
    <div
          ref={verseContainerRef}
          onWheel={markUserScroll}
          onTouchMove={markUserScroll}
          className="w-full flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-5 text-zinc-800 leading-[1.5] break-keep font-medium"
          style={{ fontSize: `${fontSize}px`, maxHeight: "320px" }}
        >
          {parsedVerses.map(({ verse, text }) => {
            return (
              <p
                key={verse}
                ref={(el) => {
                  verseRowRefs.current[verse] = el;
                }}
                className="flex items-start gap-2 rounded-lg px-2 py-1 transition-colors"
              >
                <span className="text-[#4A6741] opacity-40 text-[0.8em] font-bold mt-[2px] flex-shrink-0">{verse}</span>
                <span className="flex-1">{text}</span>
              </p>
            );
          })}
          {parsedVerses.length === 0 && bibleData.content.split("\n").map((line: string, i: number) => <p key={i}>{line}</p>)}
        </div>
      </>
    ) : (
      <div className="animate-pulse text-zinc-200 w-full text-center">
        말씀을 불러오는 중...
      </div>
    )}
  </motion.div>
</AnimatePresence>

  {/* 오른쪽 힌트 카드 (내일) */}
<div className="absolute right-[-75%] w-[82%] max-w-sm h-[450px] bg-white rounded-[32px] scale-90 blur-[0.5px] z-0" />
      </div>

      {/* 3. 툴바 (카드와 좁게, 아래와 넓게) */}
  <div className="flex items-center gap-8 mt-3 mb-4"> 
    <button onClick={() => handlePlayTTS()}  // 반드시 빈 괄호를 넣어주세요!
              className="flex flex-col items-center gap-1.5 text-zinc-400">
      <Headphones size={22} strokeWidth={1.5} />
      <span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>음성 재생</span>
    </button>
{/* 말씀 복사 버튼 찾아서 수정 */}
<button onClick={handleCopy} className="flex flex-col items-center gap-1.5 text-zinc-400">
  <Copy size={22} strokeWidth={1.5} />
  <span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>말씀 복사</span>
</button>
    <button onClick={handleBookmark} className="flex flex-col items-center gap-1.5 text-zinc-400"><Bookmark size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>기록함</span></button>
    <button onClick={handleShare} className="flex flex-col items-center gap-1.5 text-zinc-400 active:scale-95 transition-transform"><Share2 size={22} strokeWidth={1.5} /><span className="font-medium" style={{ fontSize: `${fontSize * 0.75}px` }}>공유</span></button>
  </div>
      {/* QT 묵상 질문 영역 */}
{bibleData?.qt_question && (
  <div className="w-full mt-8 mb-8 px-4">

    {/* 제목 */}
    <div className="flex items-center gap-2 mb-6">
      <div className="w-1.5 h-4 bg-[#4A6741] rounded-full opacity-70" />
      <h4
        className="font-bold text-[#4A6741] opacity-80"
        style={{ fontSize: `${fontSize * 0.95}px` }}
      >
        묵상 질문
      </h4>
    </div>

    <div className="space-y-10">
      {bibleData.qt_question
        .split(/\n?\d+\.\s/) // 번호 기준 분리
        .filter((q: string) => q.trim() !== "")
        .map((item: string, index: number, arr: string[]) => {

          // 🔥 (25절) 같은 패턴 기준으로 분리
const verseMatch = item.match(/\(\d+절\)[\.\!\?…"”"]*/);

let description = item;
let question = "";

if (verseMatch) {
  const splitIndex = verseMatch.index! + verseMatch[0].length;

  description = item.slice(0, splitIndex).trim();
  question = item.slice(splitIndex).trim();
}

          return (
            <div key={index}>

              {/* 번호 + 설명 */}
              <p
                className="leading-[1.8] break-keep"
                style={{ fontSize: `${fontSize * 0.95}px` }}
              >
                <span className="text-zinc-700 mr-1">
                  {index + 1}.
                </span>
                <span className="text-zinc-700">
                  {description}
                </span>
              </p>

              {/* 실제 질문 */}
              {question && (
                <p
                  className="mt-4 text-[#4A6741] font-semibold opacity-80 leading-[1.9] break-keep"
                  style={{ fontSize: `${fontSize * 0.95}px` }}
                >
                  {question}
                </p>
              )}

              {/* 마지막 제외 얇은 구분선 */}
              {index < arr.length - 1 && (
                <div className="w-full h-[1px] bg-zinc-200 mt-8" />
              )}
            </div>
          );
        })}
    </div>
  </div>
)}

      {/* 묵상 완료 버튼 (아멘 버튼 스타일) */}
      <div className="flex flex-col items-center gap-3 pb-6 mt-8">
        <div className="relative w-24 h-24 flex items-center justify-center">
          {/* 빛의 파동 효과 */}
          <AnimatePresence>
            {isMeditationCompleted && (
              <>
                <motion.div
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2.2, ease: "easeOut" }}
                  className="absolute inset-0 bg-[#4A6741] rounded-full"
                />
                <motion.div
                  initial={{ scale: 1, opacity: 0.4 }}
                  animate={{ scale: 1.2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.8, ease: "easeOut", delay: 0.2 }}
                  className="absolute inset-0 bg-[#4A6741] rounded-full"
                />
              </>
            )}
          </AnimatePresence>

          {/* 실제 버튼 */}
          <motion.button 
            onClick={handleMeditationComplete}
            whileTap={{ scale: 0.9 }} 
            disabled={currentDate.toDateString() !== today.toDateString()}
            className={`w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-500 relative z-10
              ${
                isMeditationCompleted
                  ? 'bg-[#4A6741] text-white border-none' 
                  : 'bg-white text-[#4A6741] border border-green-50'
              }
              ${
                currentDate.toDateString() !== today.toDateString()
                  ? 'cursor-not-allowed opacity-60'
                  : ''
              }`}
          >
            <Heart 
              className={`w-5 h-5 mb-1 ${isMeditationCompleted ? 'fill-white animate-bounce' : ''}`} 
              strokeWidth={isMeditationCompleted ? 0 : 2} 
            />
            <span className="font-bold" style={{ fontSize: `${fontSize * 0.85}px` }}>
              {isMeditationCompleted ? '묵상 완료' : '묵상 완료'}
            </span>
          </motion.button>
        </div>
      </div>

      {/* 묵상 기록 목록 */}
      {meditationRecords.length > 0 && (
        <div className="w-full max-w-md px-4 mb-6">
          <h3 className="font-bold text-[#4A6741] mb-3" style={{ fontSize: `${fontSize * 0.95}px` }}>
            묵상 기록
          </h3>
          <div className="space-y-3">
            {meditationRecords.map((record) => (
              <div key={record.id} className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100">
                {/* 텍스트 내용 */}
                {record.meditation_text && (
                  <p className="text-zinc-700 leading-relaxed mb-3 whitespace-pre-wrap" style={{ fontSize: `${fontSize * 0.9}px` }}>
                    {record.meditation_text}
                  </p>
                )}
                
                {/* 음성 재생 */}
                {record.audio_url && (
                  <div className="bg-[#4A6741]/5 rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <button
                        onClick={() => playRecordAudio(record.audio_url, record.id)}
                        className="w-8 h-8 flex items-center justify-center bg-[#4A6741] text-white rounded-full"
                      >
                        {playingAudioId === record.id ? (
                          <Pause size={16} fill="white" />
                        ) : (
                          <Play size={16} fill="white" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="text-xs text-zinc-600 mb-1">
                          {playingAudioId === record.id
                            ? `${formatTime(Math.floor(audioProgress))} / ${formatTime(Math.floor(audioDuration))}`
                            : formatTime(record.audio_duration || 0)}
                        </div>
                        <div 
                          className="h-1.5 bg-zinc-200 rounded-full overflow-hidden cursor-pointer"
                          onClick={(e) => {
                            if (playingAudioId === record.id && audioDuration > 0) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = e.clientX - rect.left;
                              const percentage = x / rect.width;
                              seekAudio(percentage * audioDuration);
                            }
                          }}
                        >
                          <div 
                            className="h-full bg-[#4A6741] transition-all"
                            style={{ 
                              width: playingAudioId === record.id && audioDuration > 0
                                ? `${(audioProgress / audioDuration) * 100}%`
                                : '0%'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 수정/삭제 버튼 */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                  <span className="text-xs text-zinc-400">
                    {new Date(record.created_at).toLocaleString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    }).replace(/\s오전\s0(\d):/, ' 오전 $1:').replace(/\s오후\s0(\d):/, ' 오후 $1:')}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditRecord(record)}
                      className="text-sm text-[#4A6741] font-medium"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => confirmDeleteRecord(record.id)}
                      className="text-sm text-red-500 font-medium"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 묵상 기록 추가하기 버튼 */}
      {isMeditationCompleted && (
        <div className="w-full max-w-md px-4 mb-6">
          <button
            onClick={() => {
              setEditingRecord(null);
              setMeditationText('');
              setAudioBlob(null);
              setRecordingTime(0);
              setShowWriteSheet(true);
            }}
            className="w-full py-3 bg-white border border-dashed border-[#4A6741]/30 text-[#4A6741] rounded-xl font-bold hover:bg-[#4A6741]/5 transition-colors"
            style={{ fontSize: `${fontSize * 0.9}px` }}
          >
            + 묵상 기록 추가하기
          </button>
        </div>
      )}

      {/* 묵상 기록 확인 모달 */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-[28px] p-8 w-full max-w-[320px] shadow-2xl text-center"
            >
              <h4 className="font-bold text-zinc-900 mb-2" style={{ fontSize: `${fontSize * 1.1}px` }}>
                묵상 기록을 남기시겠습니까?
              </h4>
              <p className="text-zinc-500 mb-6" style={{ fontSize: `${fontSize * 0.85}px` }}>
                오늘의 묵상을 글이나 음성으로 기록할 수 있습니다.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setShowConfirmModal(false);
                    setShowWriteSheet(true);
                  }}
                  className="w-full py-3 rounded-xl bg-[#4A6741] text-white font-bold transition-active active:scale-95 shadow-lg"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  기록 남기기
                </button>
                <button 
                  onClick={handleCompleteOnly}
                  className="w-full py-3 rounded-xl bg-zinc-100 text-zinc-600 font-bold transition-active active:scale-95"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  완료만 체크
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 묵상 기록 작성 시트 */}
      <AnimatePresence>
        {showWriteSheet && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowWriteSheet(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[400]"
            />
            
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-zinc-50 rounded-t-[32px] z-[401] px-6 pt-2 pb-10 max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto my-4" />
              
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-medium text-zinc-700" style={{ fontSize: `${fontSize}px` }}>
                  {editingRecord ? '묵상 기록 수정' : '묵상 기록'}
                </h3>
                <button 
                  onClick={editingRecord ? handleUpdateMeditation : handleSubmitMeditation}
                  className="text-[#4A6741] font-bold" 
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {editingRecord ? '저장' : '등록'}
                </button>
              </div>

              {/* 텍스트 입력 영역 */}
              <textarea 
                value={meditationText}
                onChange={(e) => setMeditationText(e.target.value)}
                placeholder="오늘 말씀에 대한 묵상을 기록해보세요"
                className="w-full h-40 bg-white rounded-2xl p-4 border-none focus:outline-none focus:ring-1 focus:ring-[#4A6741]/20 resize-none mb-4"
                style={{ fontSize: `${fontSize * 0.9}px` }}
              />

              {/* 음성 녹음 영역 */}
              <div className="space-y-3">
                <p className="text-zinc-600 font-medium text-sm">음성으로 기록</p>
                
                {/* 기존 음성 파일 (수정 모드) */}
                {editingRecord?.audio_url && !audioBlob && (
                  <div className="bg-white rounded-xl p-4 border border-zinc-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#4A6741]/10 rounded-full flex items-center justify-center">
                          <Mic size={20} className="text-[#4A6741]" />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-700" style={{ fontSize: `${fontSize * 0.9}px` }}>
                            기존 음성 녹음
                          </p>
                          <p className="text-zinc-400 text-sm">{formatTime(editingRecord.audio_duration || 0)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => playRecordAudio(editingRecord.audio_url, -1)}
                        className="w-8 h-8 flex items-center justify-center bg-[#4A6741] text-white rounded-full"
                      >
                        {playingAudioId === -1 ? (
                          <Pause size={14} fill="white" />
                        ) : (
                          <Play size={14} fill="white" />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={deleteExistingAudio}
                      className="w-full py-2 text-red-500 font-medium text-sm"
                    >
                      기존 음성 삭제
                    </button>
                  </div>
                )}
                
                {!audioBlob && (!editingRecord || !editingRecord.audio_url) ? (
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-full py-4 rounded-xl font-bold transition-all ${
                      isRecording
                        ? 'bg-red-500 text-white'
                        : 'bg-white border border-zinc-200 text-zinc-700'
                    }`}
                    style={{ fontSize: `${fontSize * 0.9}px` }}
                  >
                    {isRecording ? (
                      <div className="flex items-center justify-center gap-2">
                        <Square size={20} className="fill-current" />
                        <span>녹음 중지 ({formatTime(recordingTime)})</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Mic size={20} />
                        <span>음성 녹음 시작</span>
                      </div>
                    )}
                  </button>
                ) : audioBlob ? (
                  <div className="bg-white rounded-xl p-4 border border-zinc-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#4A6741]/10 rounded-full flex items-center justify-center">
                          <Mic size={20} className="text-[#4A6741]" />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-700" style={{ fontSize: `${fontSize * 0.9}px` }}>
                            음성 녹음 완료
                          </p>
                          <p className="text-zinc-400 text-sm">{formatTime(recordingTime)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const url = URL.createObjectURL(audioBlob);
                          playRecordAudio(url, -2);
                        }}
                        className="w-8 h-8 flex items-center justify-center bg-[#4A6741] text-white rounded-full mr-2"
                      >
                        {playingAudioId === -2 ? (
                          <Pause size={14} fill="white" />
                        ) : (
                          <Play size={14} fill="white" />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={deleteAudio}
                      className="w-full py-2 text-red-500 font-medium text-sm"
                    >
                      삭제
                    </button>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 묵상 완료 취소 확인 모달 */}
      <AnimatePresence>
        {showCancelConfirmModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowCancelConfirmModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-[28px] p-8 w-full max-w-[280px] shadow-2xl text-center"
            >
              <h4 className="font-bold text-zinc-900 mb-2" style={{ fontSize: `${fontSize}px` }}>
                묵상 완료를 취소할까요?
              </h4>
              <p className="text-zinc-500 mb-6" style={{ fontSize: `${fontSize * 0.85}px` }}>
                오늘 날짜의 모든 묵상 기록이 삭제됩니다.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowCancelConfirmModal(false)}
                  className="flex-1 py-3 rounded-xl bg-zinc-100 text-zinc-600 font-bold transition-active active:scale-95"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  아니오
                </button>
                <button 
                  onClick={handleCancelMeditation}
                  className="flex-1 py-3 rounded-xl bg-[#4A6741] text-white font-bold transition-active active:scale-95 shadow-lg"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  취소하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 삭제 확인 모달 */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-[28px] p-8 w-full max-w-[280px] shadow-2xl text-center"
            >
              <h4 className="font-bold text-zinc-900 mb-2" style={{ fontSize: `${fontSize}px` }}>
                묵상 기록을 삭제할까요?
              </h4>
              <p className="text-zinc-500 mb-6" style={{ fontSize: `${fontSize * 0.85}px` }}>
                삭제된 기록은 복구할 수 없습니다.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-zinc-100 text-zinc-600 font-bold transition-active active:scale-95"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  취소
                </button>
                <button 
                  onClick={handleDeleteRecord}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold transition-active active:scale-95 shadow-lg shadow-red-200"
                  style={{ fontSize: `${fontSize * 0.9}px` }}
                >
                  삭제
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BibleAudioPlayerModal
        open={showAudioControl}
        loading={audioLoading}
        subtitle={audioSubtitle}
        fontSize={fontSize}
        isPlaying={isPlaying}
        progress={audioCurrentTime}
        duration={audioDurationUi}
        onClose={closeAudioModal}
        onTogglePlay={togglePlay}
        onSeek={handleSeekAudio}
        onPrevVerse={jumpPrevVerse}
        onNextVerse={jumpNextVerse}
      />
<AnimatePresence>
  {showCopyToast && (
    <motion.div 
      initial={{ opacity: 0, x: "-50%", y: 20 }} // x는 중앙 고정, y만 움직임
      animate={{ opacity: 1, x: "-50%", y: 0 }} 
      exit={{ opacity: 0, x: "-50%", y: 20 }} 
      transition={{ duration: 0.3 }}
      className="fixed bottom-36 left-1/2 z-[200] bg-[#4A6741] text-white px-6 py-3 rounded-full shadow-lg text-sm font-medium whitespace-nowrap"
      style={{ left: '50%', transform: 'translateX(-50%)' }} // 인라인 스타일로 한 번 더 강제
    >
      말씀이 복사되었습니다
    </motion.div>
  )}
</AnimatePresence>

{/* 로그인 모달 */}
<LoginModal 
  open={showLoginModal} 
  onOpenChange={setShowLoginModal}
  returnTo={`${window.location.origin}/#/qt`}
/> 

<AnimatePresence>
  {showGroupLinkPrompt && (
    <div className="fixed inset-0 z-[320] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeQtGroupLinkFlow}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-white rounded-[28px] p-6 w-full max-w-[360px] shadow-2xl text-center"
      >
        <h4 className="font-bold text-zinc-900 mb-2" style={{ fontSize: `${fontSize}px` }}>
          모임에 완료 연결할까요?
        </h4>
        <p className="text-zinc-500 mb-6" style={{ fontSize: `${fontSize * 0.85}px` }}>
          지금 저장한 QT 기록을 모임 신앙생활에 연결할 수 있습니다.
        </p>
        <div className="flex gap-3">
          <button
            onClick={closeQtGroupLinkFlow}
            className="flex-1 py-3 rounded-xl bg-zinc-100 text-zinc-700 font-bold"
          >
            나중에
          </button>
          <button
            onClick={() => {
              setShowGroupLinkPrompt(false);
              setShowGroupLinkModal(true);
            }}
            className="flex-1 py-3 rounded-xl bg-[#4A6741] text-white font-bold"
          >
            연결하기
          </button>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>

<AnimatePresence>
  {showGroupLinkModal && pendingGroupLinkSourceRowId && (
    <div className="fixed inset-0 z-[330] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeQtGroupLinkFlow}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-white rounded-[28px] p-6 w-full max-w-[420px] shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-zinc-900" style={{ fontSize: `${fontSize * 0.95}px` }}>
            연결할 모임 선택
          </h4>
          <button
            onClick={closeQtGroupLinkFlow}
            className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center"
          >
            <X size={14} />
          </button>
        </div>
        <div className="space-y-2 max-h-[320px] overflow-y-auto">
          {myGroups.map((group) => (
            <div key={group.id} className="flex items-center justify-between bg-zinc-50 rounded-xl px-3 py-2">
              <span className="text-sm font-semibold text-zinc-800">{group.name}</span>
              <button
                onClick={() => handleQtGroupLink(group.id)}
                disabled={linkingGroupId === group.id}
                className="px-3 py-1.5 rounded-lg bg-[#4A6741] text-white text-xs font-bold disabled:opacity-60"
              >
                {linkingGroupId === group.id ? "연결 중..." : "연결"}
              </button>
            </div>
          ))}
          {myGroups.length === 0 && (
            <div className="text-sm text-zinc-500 text-center py-6">연결 가능한 모임이 없습니다.</div>
          )}
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>
    </div>
  );
}
