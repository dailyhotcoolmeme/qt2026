import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  className?: string;
  inline?: boolean;
}

export function VoiceRecorder({ onTranscript, className, inline = false }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const isStoppingRef = useRef(false);
  const lastTranscriptRef = useRef("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      isStoppingRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const debouncedOnTranscript = useCallback((text: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (text !== lastTranscriptRef.current && text.trim()) {
        lastTranscriptRef.current = text;
        onTranscript(text);
      }
    }, 300);
  }, [onTranscript]);

  const startRecording = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({ 
        title: "음성 인식 불가", 
        description: "Chrome 브라우저를 사용해 주세요.", 
        variant: "destructive" 
      });
      return;
    }

    isStoppingRef.current = false;
    lastTranscriptRef.current = "";
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'ko-KR';
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = "";

    recognition.onstart = () => {
      setIsRecording(true);
      setTranscript("");
      finalTranscript = "";
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      
      const currentTranscript = finalTranscript + interimTranscript;
      setTranscript(currentTranscript);
      debouncedOnTranscript(currentTranscript);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      console.error('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
      if (!isStoppingRef.current && recognitionRef.current) {
        try {
          recognition.start();
        } catch (e) {
          setIsRecording(false);
        }
      } else {
        setIsRecording(false);
      }
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (e) {
      toast({ title: "음성 인식 시작 실패", variant: "destructive" });
    }
  }, [debouncedOnTranscript, toast]);

  const stopRecording = useCallback(() => {
    isStoppingRef.current = true;
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    
    setIsRecording(false);
    toast({ title: "녹음 완료", description: "음성이 텍스트로 변환되었습니다." });
    setTranscript("");
  }, [toast]);

  if (isRecording) {
    if (inline) {
      return (
        <div className={cn("flex items-center gap-2", className)}>
          <div className="flex items-center gap-1.5 text-red-500">
            <div className="relative">
              <Mic className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            </div>
            <span className="text-xs font-medium">기록 중</span>
            <Loader2 className="w-3 h-3 animate-spin" />
          </div>
          <Button 
            onClick={stopRecording}
            size="sm"
            className="h-7 px-3 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs"
            data-testid="button-stop-recording"
          >
            <Square className="w-3 h-3 mr-1 fill-current" />
            완료
          </Button>
        </div>
      );
    }

    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <div className="relative">
            <Mic className="w-5 h-5 text-red-500" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </div>
          <span className="text-sm font-medium text-red-600 flex-1">기록 중...</span>
          <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
          <Button 
            onClick={stopRecording}
            size="sm"
            className="h-8 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg"
            data-testid="button-stop-recording"
          >
            <Square className="mr-1 h-3 w-3 fill-current" />
            완료
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button 
      onClick={startRecording}
      variant="outline"
      className={cn("rounded-xl border-zinc-200 text-zinc-600 hover:bg-zinc-50", className)}
      data-testid="button-start-recording"
    >
      <Mic className="mr-1.5 h-4 w-4" />
      음성으로 기록
    </Button>
  );
}
