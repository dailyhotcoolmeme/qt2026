import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TTSButtonProps {
  content: string;
  reference: string;
  label?: string;
  variant?: "primary" | "secondary";
  className?: string;
}

const koreanNumbers: Record<number, string> = {
  1: "일", 2: "이", 3: "삼", 4: "사", 5: "오",
  6: "육", 7: "칠", 8: "팔", 9: "구", 10: "십",
  11: "십일", 12: "십이", 13: "십삼", 14: "십사", 15: "십오",
  16: "십육", 17: "십칠", 18: "십팔", 19: "십구", 20: "이십",
  21: "이십일", 22: "이십이", 23: "이십삼", 24: "이십사", 25: "이십오",
  26: "이십육", 27: "이십칠", 28: "이십팔", 29: "이십구", 30: "삼십",
  31: "삼십일", 32: "삼십이", 33: "삼십삼", 34: "삼십사", 35: "삼십오",
  36: "삼십육", 37: "삼십칠", 38: "삼십팔", 39: "삼십구", 40: "사십",
  41: "사십일", 42: "사십이", 43: "사십삼", 44: "사십사", 45: "사십오",
  46: "사십육", 47: "사십칠", 48: "사십팔", 49: "사십구", 50: "오십",
};

function numberToKorean(n: number): string {
  if (koreanNumbers[n]) return koreanNumbers[n];
  if (n > 50 && n <= 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    const tensStr = ["", "", "이", "삼", "사", "오", "육", "칠", "팔", "구"][tens] + "십";
    const onesStr = ones > 0 ? koreanNumbers[ones] : "";
    return tensStr + onesStr;
  }
  if (n > 100) {
    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;
    const hundredStr = hundreds === 1 ? "백" : numberToKorean(hundreds) + "백";
    if (remainder === 0) return hundredStr;
    return hundredStr + numberToKorean(remainder);
  }
  return String(n);
}

function formatReferenceForSpeech(ref: string): string {
  let result = ref;
  
  if (ref.includes("시편")) {
    result = result.replace(/시편\s*(\d+):(\d+)-(\d+)/g, (_, ch, v1, v2) => 
      `시편 ${numberToKorean(parseInt(ch))} 편 ${numberToKorean(parseInt(v1))} 절에서 ${numberToKorean(parseInt(v2))} 절`
    );
    result = result.replace(/시편\s*(\d+):(\d+)/g, (_, ch, v) => 
      `시편 ${numberToKorean(parseInt(ch))} 편 ${numberToKorean(parseInt(v))} 절`
    );
  } else {
    result = result.replace(/(\d+):(\d+)-(\d+)/g, (_, ch, v1, v2) => 
      `${numberToKorean(parseInt(ch))} 장 ${numberToKorean(parseInt(v1))} 절에서 ${numberToKorean(parseInt(v2))} 절`
    );
    result = result.replace(/(\d+):(\d+)/g, (_, ch, v) => 
      `${numberToKorean(parseInt(ch))} 장 ${numberToKorean(parseInt(v))} 절`
    );
  }
  
  return result;
}

export function TTSButton({ content, reference, label = "듣기", variant = "primary", className }: TTSButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const pauseIndexRef = useRef(0);
  const fullTextRef = useRef<string>("");
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentCharIndexRef = useRef(0);
  const isPausingRef = useRef(false);
  const isStoppingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      isStoppingRef.current = true;
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const speakFromIndex = useCallback((startIndex: number) => {
    const synth = synthRef.current;
    if (!synth) return;

    isPausingRef.current = false;
    isStoppingRef.current = false;
    synth.cancel();

    const textToSpeak = fullTextRef.current.substring(startIndex);
    if (!textToSpeak.trim()) {
      setIsPlaying(false);
      setIsPaused(false);
      pauseIndexRef.current = 0;
      currentCharIndexRef.current = 0;
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9;
    
    utterance.onboundary = (event) => {
      if (event.name === 'word' || event.name === 'sentence') {
        currentCharIndexRef.current = startIndex + event.charIndex;
      }
    };
    
    utterance.onend = () => {
      if (isPausingRef.current) {
        return;
      }
      setIsPlaying(false);
      setIsPaused(false);
      pauseIndexRef.current = 0;
      currentCharIndexRef.current = 0;
    };
    
    utterance.onerror = (e) => {
      if (isPausingRef.current || isStoppingRef.current) {
        return;
      }
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        setIsPlaying(false);
        setIsPaused(false);
        pauseIndexRef.current = 0;
        currentCharIndexRef.current = 0;
      }
    };

    synth.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  }, []);

  const handleSpeak = () => {
    const formattedRef = formatReferenceForSpeech(reference);
    fullTextRef.current = `${content}. ${formattedRef}. 말씀`;
    pauseIndexRef.current = 0;
    currentCharIndexRef.current = 0;
    speakFromIndex(0);
  };

  const handlePause = () => {
    const synth = synthRef.current;
    if (!synth) return;

    isPausingRef.current = true;
    pauseIndexRef.current = currentCharIndexRef.current;
    synth.cancel();
    setIsPaused(true);
    setIsPlaying(true);
  };

  const handleResume = () => {
    speakFromIndex(pauseIndexRef.current);
  };

  const handleStop = () => {
    const synth = synthRef.current;
    if (!synth) return;

    isStoppingRef.current = true;
    synth.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    pauseIndexRef.current = 0;
    currentCharIndexRef.current = 0;
  };

  if (!isPlaying && !isPaused) {
    return (
      <Button
        onClick={handleSpeak}
        className={cn(
          "w-full rounded-xl py-5 font-bold shadow-lg shadow-primary/10 transition-all hover:scale-[1.02] active:scale-[0.98]",
          variant === "primary" 
            ? "bg-[#5D7BAF] hover:bg-[#4A6491] text-white" 
            : "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 shadow-sm",
          className
        )}
        data-testid="button-tts-play"
      >
        {variant === "primary" ? <Play className="mr-2 h-5 w-5 fill-current" /> : <Volume2 className="mr-2 h-5 w-5" />}
        {label}
      </Button>
    );
  }

  return (
    <div className="flex gap-2 w-full animate-in fade-in zoom-in duration-300">
      <Button
        onClick={isPaused ? handleResume : handlePause}
        variant="outline"
        className="flex-1 rounded-xl py-5 border-zinc-200 bg-white text-[#5D7BAF] font-semibold hover:bg-zinc-50"
        data-testid="button-tts-pause"
      >
        {isPaused ? <Play className="mr-2 h-4 w-4 fill-current" /> : <Pause className="mr-2 h-4 w-4 fill-current" />}
        {isPaused ? "이어서 재생" : "일시중지"}
      </Button>
      <Button
        onClick={handleStop}
        variant="outline"
        className="flex-1 rounded-xl py-5 border-zinc-200 bg-white text-zinc-500 font-semibold hover:bg-zinc-50 hover:text-red-500"
        data-testid="button-tts-stop"
      >
        <Square className="mr-2 h-4 w-4 fill-current" />
        중단
      </Button>
    </div>
  );
}
