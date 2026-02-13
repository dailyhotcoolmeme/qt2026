import fetch from 'node-fetch';

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { audioUrl } = req.body;
    
    if (!audioUrl) {
      return res.status(400).json({ 
        success: false, 
        error: "audioUrl이 필요합니다" 
      });
    }

    // OpenAI Whisper API를 사용하여 오디오 파일을 텍스트로 변환
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다.');
      return res.status(500).json({ 
        success: false, 
        error: '서버 설정 오류' 
      });
    }

    // 오디오 파일 다운로드
    const audioResponse = await fetch(audioUrl);
    const audioBuffer = await audioResponse.buffer();

    // FormData 생성
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: 'audio.webm',
      contentType: 'audio/webm'
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'ko'); // 한국어로 설정
    formData.append('response_format', 'text');

    // OpenAI Whisper API 호출
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper API 오류:', errorText);
      return res.status(500).json({ 
        success: false, 
        error: 'STT 변환 실패',
        details: errorText
      });
    }

    const transcription = await whisperResponse.text();

    // 키워드 분석 (단어 빈도수)
    const keywords = analyzeKeywords(transcription);

    return res.status(200).json({
      success: true,
      transcription,
      keywords
    });

  } catch (error) {
    console.error('Transcribe API 오류:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// 키워드 분석 함수
function analyzeKeywords(text) {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // 한국어 불용어 (stopwords) 리스트
  const stopWords = new Set([
    '이', '그', '저', '것', '수', '등', '들', '및', '또는',
    '그리고', '하지만', '그러나', '그래서', '따라서',
    '나', '너', '저', '우리', '당신', '그들',
    '이것', '그것', '저것', '여기', '거기', '저기',
    '이제', '지금', '언제', '어디', '무엇', '누구', '어떻게', '왜',
    '있다', '없다', '이다', '아니다', '되다', '하다',
    '좀', '더', '가장', '매우', '아주', '너무', '정말', '참',
    '을', '를', '이', '가', '은', '는', '에', '에서', '으로', '로',
    '의', '에게', '께', '한테', '에', '와', '과',
    '도', '만', '까지', '부터', '마저', '조차'
  ]);

  // 텍스트 정제 및 단어 추출
  const words = text
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'\[\]]/g, ' ') // 구두점 제거
    .toLowerCase()
    .split(/\s+/) // 공백으로 분리
    .filter(word => 
      word.length >= 2 && // 2글자 이상
      !stopWords.has(word) && // 불용어 제외
      !/^\d+$/.test(word) // 숫자만 있는 단어 제외
    );

  // 단어 빈도수 계산
  const frequency = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // 빈도수 기준으로 정렬
  const keywords = Object.entries(frequency)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // 상위 20개만 반환

  return keywords;
}
