import { useState, useRef, useCallback, useEffect } from 'react';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

// Safe access - speechSynthesis not available in Android WebView
const synth = typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis : null;

// Words that signal end of conversation
const GOODBYE_WORDS = [
  'merci', 'ok merci', 'au revoir', 'bonne nuit', 'bonne soiree',
  'a bientot', 'ciao', 'bye', 'salut', "j'ai fini", 'c\'est tout',
  'c\'est bon', 'ca suffit', 'stop', 'arrete', 'ferme',
];

// DOM-based audio element - more reliable in WebView than new Audio()
let domAudio: HTMLAudioElement | null = null;
function getOrCreateAudio(): HTMLAudioElement {
  if (!domAudio || !document.body.contains(domAudio)) {
    domAudio = document.createElement('audio');
    domAudio.id = 'ltdd-tts-player';
    domAudio.setAttribute('playsinline', '');
    domAudio.setAttribute('webkit-playsinline', '');
    domAudio.preload = 'auto';
    domAudio.volume = 1.0;
    domAudio.style.display = 'none';
    document.body.appendChild(domAudio);
    // Unlock with silent play on user gesture
    domAudio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dX/////////////////////////////AAAAAAAAAAAAAAAA/+M4wAAHAAHkAAAAAP/jOMATPAAB5AAAAAAAAAAAAAAAAAAAAAAAAAAA/+M4wH4AAHkAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    domAudio.play().catch(() => {});
  }
  return domAudio;
}

export function useVoiceChat() {
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [lastUserText, setLastUserText] = useState('');
  const [lastAiText, setLastAiText] = useState('');
  const [isSupported, setIsSupported] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const frenchVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const onResultRef = useRef<((text: string) => void) | null>(null);
  const autoListenAfterSpeakRef = useRef(true);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceStartRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const interruptCallbackRef = useRef<(() => void) | null>(null); // abort streaming chat

  // Silence detection threshold and duration
  const SILENCE_THRESHOLD = 15; // volume level below which = silence
  const SILENCE_DURATION = 1200; // 1.2 seconds of silence = stop (was 2s)

  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsSupported(false);
    }
    if (!synth) return;
    const loadVoices = () => {
      try {
        const voices = synth.getVoices();
        frenchVoiceRef.current = voices.find(v => v.lang.startsWith('fr')) || null;
      } catch {}
    };
    loadVoices();
    try {
      synth.addEventListener('voiceschanged', loadVoices);
      return () => synth.removeEventListener('voiceschanged', loadVoices);
    } catch {}
  }, []);

  // Check if user is saying goodbye
  const isGoodbye = useCallback((text: string): boolean => {
    const normalized = text.toLowerCase().trim()
      .replace(/[.,!?;:'"]/g, '')
      .replace(/\s+/g, ' ');
    return GOODBYE_WORDS.some(w => normalized === w || normalized.startsWith(w + ' ') || normalized.endsWith(' ' + w));
  }, []);


  // Monitor audio volume for silence detection
  const startSilenceDetection = useCallback((stream: MediaStream) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      silenceStartRef.current = 0;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let hasSpeech = false;

      const check = () => {
        if (!analyserRef.current) return;
        analyser.getByteFrequencyData(dataArray);

        // Average volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;

        if (avg > SILENCE_THRESHOLD) {
          // Voice detected
          hasSpeech = true;
          silenceStartRef.current = 0;
        } else if (hasSpeech) {
          // Silence after speech
          if (silenceStartRef.current === 0) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current > SILENCE_DURATION) {
            // 2 seconds of silence → auto stop
            stopListeningInternal();
            return;
          }
        }

        rafRef.current = requestAnimationFrame(check);
      };
      rafRef.current = requestAnimationFrame(check);
    } catch (e) {
      console.error('Silence detection error:', e);
    }
  }, []);

  const stopSilenceDetection = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    analyserRef.current = null;
    silenceStartRef.current = 0;
    try { audioContextRef.current?.close(); } catch {}
    audioContextRef.current = null;
  }, []);

  // Internal stop that triggers transcription
  const stopListeningInternal = useCallback(() => {
    stopSilenceDetection();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, [stopSilenceDetection]);

  // Start recording with auto silence detection
  const startListening = useCallback(async () => {
    try { synth?.cancel(); } catch {}
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

        // Skip if too small (no real audio)
        if (audioBlob.size < 1000) {
          setVoiceState('idle');
          if (autoListenAfterSpeakRef.current) {
            setTimeout(() => startListening(), 500);
          }
          return;
        }

        setVoiceState('processing');

        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        try {
          const resp = await fetch('/api/transcribe', {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });
          const data = await resp.json();
          if (data.text && data.text.trim().length > 1) {
            setLastUserText(data.text);

            // Check for goodbye phrases
            if (isGoodbye(data.text)) {
              // Say goodbye and exit
              setVoiceState('speaking');
              await speakWithServerDirect('Au revoir, que la paix soit avec vous.');
              exitVoiceModeInternal();
              return;
            }

            setVoiceState('processing');

            if (onResultRef.current) {
              onResultRef.current(data.text);
            }
          } else {
            // No transcription, re-listen
            setVoiceState('idle');
            if (autoListenAfterSpeakRef.current) {
              setTimeout(() => startListening(), 300);
            }
          }
        } catch (err) {
          console.error('Transcription failed:', err);
          setVoiceState('idle');
          if (autoListenAfterSpeakRef.current) {
            setTimeout(() => startListening(), 500);
          }
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250); // Collect chunks every 250ms
      setVoiceState('listening');

      // Start silence detection
      startSilenceDetection(stream);

    } catch (err) {
      console.error('Microphone error:', err);
      setVoiceState('idle');
    }
  }, [isGoodbye, startSilenceDetection, stopSilenceDetection]);

  // Public stop (also used by vortex tap)
  const stopListening = useCallback(() => {
    stopSilenceDetection();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, [stopSilenceDetection]);

  // Play audio blob using the shared (autoplay-unlocked) audio element
  const playAudioBlob = useCallback((blob: Blob): Promise<void> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = getOrCreateAudio();
      currentAudioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); currentAudioRef.current = null; resolve(); };
      audio.onerror = () => { URL.revokeObjectURL(url); currentAudioRef.current = null; resolve(); };
      audio.src = url;
      audio.play().catch((e) => { console.error('[VOICE] play error:', e); URL.revokeObjectURL(url); resolve(); });
    });
  }, []);

  // Direct server TTS (for goodbye message)
  const speakWithServerDirect = useCallback(async (text: string): Promise<void> => {
    try {
      const voicePref = localStorage.getItem('ltdd-voice') || 'amina';
      const resp = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text, voice: voicePref }),
      });
      if (!resp.ok) return;
      const blob = await resp.blob();
      await playAudioBlob(blob);
    } catch {}
  }, [playAudioBlob]);

  // Interrupt: stop current audio + abort chat streaming, then start listening
  const interruptAndListen = useCallback(() => {
    // Stop TTS audio
    try { currentAudioRef.current?.pause(); } catch {}
    currentAudioRef.current = null;
    // Abort any ongoing chat stream
    if (interruptCallbackRef.current) {
      interruptCallbackRef.current();
      interruptCallbackRef.current = null;
    }
    setVoiceState('listening');
    // Start recording immediately
    startListening();
  }, [startListening]);

  // Monitor mic during AI speech for user interruption
  const startInterruptionDetection = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let loudFrames = 0;

      const check = () => {
        // Stop detection if no longer speaking
        if (!currentAudioRef.current) {
          stream.getTracks().forEach(t => t.stop());
          ctx.close().catch(() => {});
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;

        if (avg > 25) { // User is speaking
          loudFrames++;
          if (loudFrames > 8) { // ~250ms of speech detected
            stream.getTracks().forEach(t => t.stop());
            ctx.close().catch(() => {});
            interruptAndListen();
            return;
          }
        } else {
          loudFrames = Math.max(0, loudFrames - 1);
        }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    } catch {}
  }, [interruptAndListen]);

  // Server TTS with auto re-listen + interrupt detection
  const speakWithServer = useCallback((text: string): Promise<void> => {
    return new Promise(async (resolve) => {

      const done = () => {
        setVoiceState('idle');
        resolve();
        // Auto re-listen after AI finishes speaking
        if (autoListenAfterSpeakRef.current) {
          setTimeout(() => { if (autoListenAfterSpeakRef.current) startListening(); }, 400);
        }
      };

      try {
        const voicePref = localStorage.getItem('ltdd-voice') || 'amina';
        console.log('[VOICE] Fetching TTS for', text.length, 'chars');
        const resp = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ text, voice: voicePref }),
        });

        if (!resp.ok) throw new Error('TTS failed: ' + resp.status);

        const blob = await resp.blob();
        console.log('[VOICE] Got audio blob:', blob.size, 'bytes');

        // Use shared audio element (unlocked from user gesture)
        const url = URL.createObjectURL(blob);
        const audio = getOrCreateAudio();
        currentAudioRef.current = audio;

        await new Promise<void>((playResolve) => {
          audio.onended = () => { URL.revokeObjectURL(url); currentAudioRef.current = null; playResolve(); };
          audio.onerror = () => { URL.revokeObjectURL(url); currentAudioRef.current = null; playResolve(); };
          audio.src = url;
          audio.play()
            .then(() => console.log('[VOICE] Audio playing!'))
            .catch((e) => { console.error('[VOICE] Play blocked:', e.message); playResolve(); });
        });

        done();
      } catch (err: any) {
        console.error('[VOICE] TTS error:', err.message);
        done();
      }
    });
  }, [startListening, startInterruptionDetection]);

  // Queue-based TTS: play sentences one by one
  const ttsQueueRef = useRef<string[]>([]);
  const ttsPlayingRef = useRef(false);
  const ttsAbortedRef = useRef(false);

  const playNextInQueue = useCallback(async () => {
    if (ttsAbortedRef.current || ttsQueueRef.current.length === 0) {
      ttsPlayingRef.current = false;
      if (!ttsAbortedRef.current) {
        setVoiceState('idle');
        if (autoListenAfterSpeakRef.current) {
          setTimeout(() => { if (autoListenAfterSpeakRef.current) startListening(); }, 400);
        }
      }
      return;
    }

    ttsPlayingRef.current = true;
    const sentence = ttsQueueRef.current.shift()!;

    try {
      const voicePref = localStorage.getItem('ltdd-voice') || 'amina';
      const resp = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: sentence, voice: voicePref }),
      });
      if (!resp.ok) throw new Error('TTS failed');

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;

      await new Promise<void>((resolve) => {
        audio.onended = () => { URL.revokeObjectURL(url); currentAudioRef.current = null; resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); currentAudioRef.current = null; resolve(); };
        audio.play().catch(() => resolve());
      });

      // Start interruption detection for next sentence too
      if (ttsQueueRef.current.length > 0 && !ttsAbortedRef.current) {
        startInterruptionDetection();
      }
    } catch {}

    // Play next sentence in queue
    if (!ttsAbortedRef.current) {
      playNextInQueue();
    }
  }, [startListening, startInterruptionDetection]);

  // Add a sentence to TTS queue and start playing if not already
  const queueTTSSentence = useCallback((sentence: string) => {
    ttsQueueRef.current.push(sentence);
    if (!ttsPlayingRef.current) {
      playNextInQueue();
    }
  }, [playNextInQueue]);

  // Speak full text (legacy - used when streaming is done)
  const speakText = useCallback((text: string): Promise<void> => {
    if (!text.trim()) { setVoiceState('idle'); return Promise.resolve(); }
    setLastAiText(text.slice(0, 200));
    setVoiceState('speaking');
    ttsAbortedRef.current = false;

    // Split into sentences and queue them
    const sentences = text
      .replace(/([.!?])\s+/g, '$1|||')
      .split('|||')
      .map(s => s.trim())
      .filter(s => s.length > 2);

    if (sentences.length === 0) {
      setVoiceState('idle');
      return Promise.resolve();
    }

    // Queue all sentences
    ttsQueueRef.current = [];
    sentences.forEach(s => ttsQueueRef.current.push(s));

    // Start playing + monitor for interruption
    playNextInQueue();
    startInterruptionDetection();

    // Return a promise that resolves when queue is empty
    return new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (!ttsPlayingRef.current || ttsAbortedRef.current) {
          clearInterval(check);
          resolve();
        }
      }, 200);
    });
  }, [playNextInQueue, startInterruptionDetection]);

  const stopSpeaking = useCallback(() => {
    try {
      if (domAudio) { domAudio.pause(); domAudio.currentTime = 0; }
      currentAudioRef.current = null;
    } catch {}
    try { synth?.cancel(); } catch {}
    setVoiceState('idle');
    synthRef.current = null;
  }, []);

  // Internal exit (for goodbye detection)
  const exitVoiceModeInternal = useCallback(() => {
    autoListenAfterSpeakRef.current = false;
    onResultRef.current = null;
    stopSilenceDetection();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    try { currentAudioRef.current?.pause(); } catch {}
    try { synth?.cancel(); } catch {}
    synthRef.current = null;
    setIsVoiceMode(false);
    setVoiceState('idle');
  }, [stopSilenceDetection]);

  // Enter voice mode - MUST be called from user gesture (click/tap) to unlock audio
  const enterVoiceMode = useCallback((onResult: (text: string) => void) => {
    // Initialize shared audio on user gesture to bypass autoplay policy
    getOrCreateAudio();
    onResultRef.current = onResult;
    autoListenAfterSpeakRef.current = true;
    setIsVoiceMode(true);
    setVoiceState('idle');
    setLastUserText('');
    setLastAiText('');
    setTimeout(() => startListening(), 300);
  }, [startListening]);

  // Exit voice mode (user-triggered)
  const exitVoiceMode = useCallback(() => {
    exitVoiceModeInternal();
  }, [exitVoiceModeInternal]);

  // Let ChatPage set the abort callback for streaming interruption
  const setInterruptCallback = useCallback((cb: (() => void) | null) => {
    interruptCallbackRef.current = cb;
  }, []);

  // Stop TTS queue on interruption
  const abortTTSQueue = useCallback(() => {
    ttsAbortedRef.current = true;
    ttsQueueRef.current = [];
    try { currentAudioRef.current?.pause(); } catch {}
    currentAudioRef.current = null;
    ttsPlayingRef.current = false;
  }, []);

  return {
    isVoiceMode, voiceState, isSupported, lastUserText, lastAiText,
    enterVoiceMode, exitVoiceMode, startListening, stopListening, speakText, stopSpeaking,
    setInterruptCallback, queueTTSSentence, abortTTSQueue,
  };
}
