import React, { useState, useRef, useEffect, useCallback } from 'react';
import { type Conversation, type Message as MessageType } from '../App';
import Message from './Message';
import { useVoiceChat } from '../hooks/useVoiceChat';

interface ChatPageProps {
  conversation: Conversation | null;
  selectedModel: string;
  onCreateConversation: () => void;
  onUpdateConversation: (id: string, updater: (c: Conversation) => Conversation) => void;
  onUpdateRemaining: (remaining: number) => void;
}

export default function ChatPage({
  conversation,
  selectedModel,
  onCreateConversation,
  onUpdateConversation,
  onUpdateRemaining,
}: ChatPageProps) {
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const lastTapRef = useRef(0);

  const {
    isVoiceMode, voiceState, lastUserText, lastAiText,
    enterVoiceMode, exitVoiceMode, speakText, stopSpeaking,
  } = useVoiceChat();

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  useEffect(() => { scrollToBottom(); }, [conversation?.messages?.length, scrollToBottom]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleAbort = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  // Send message (text or from voice)
  const doSend = useCallback(async (text: string, fromVoice = false) => {
    if (!text.trim() || isStreaming) return;

    let convId = conversation?.id;
    if (!convId) {
      onCreateConversation();
      return;
    }

    const userMessage: MessageType = { role: 'user', content: text.trim() };
    const assistantMessage: MessageType = { role: 'assistant', content: '' };

    onUpdateConversation(convId, (c) => ({
      ...c,
      messages: [...c.messages, userMessage, assistantMessage],
      title: c.messages.length === 0 ? text.trim().slice(0, 40) : c.title,
    }));

    if (!fromVoice) setInput('');
    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    let fullContent = '';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          model: selectedModel,
          messages: [...(conversation?.messages || []).filter(m => m.content && m.content.trim()), userMessage],
          voiceMode: fromVoice || false,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Erreur serveur');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                onUpdateConversation(convId!, (c) => ({
                  ...c,
                  messages: c.messages.map((m, i) =>
                    i === c.messages.length - 1 ? { ...m, content: fullContent } : m
                  ),
                }));
              }
              if (parsed.remaining !== undefined) onUpdateRemaining(parsed.remaining);
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const errMsg = err.message || 'Erreur de connexion.';
        fullContent = errMsg;
        onUpdateConversation(convId!, (c) => ({
          ...c,
          messages: c.messages.map((m, i) =>
            i === c.messages.length - 1 ? { ...m, content: errMsg } : m
          ),
        }));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }

    // If in voice mode, speak the response
    if (fromVoice && fullContent) {
      speakText(fullContent);
    }
  }, [isStreaming, conversation, selectedModel, onCreateConversation, onUpdateConversation, onUpdateRemaining, speakText]);

  // Voice mode: when transcription comes back, auto-send
  const handleVoiceResult = useCallback((text: string) => {
    if (conversation?.id) {
      doSend(text, true);
    }
  }, [conversation?.id, doSend]);

  // Enter voice mode
  const handleEnterVoice = useCallback(() => {
    if (!conversation) {
      onCreateConversation();
      setTimeout(() => enterVoiceMode(handleVoiceResult), 300);
    } else {
      enterVoiceMode(handleVoiceResult);
    }
  }, [conversation, onCreateConversation, enterVoiceMode, handleVoiceResult]);

  // Double tap on vortex to stop
  const handleVortexTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      setShowStopConfirm(true);
    }
    lastTapRef.current = now;
  }, []);

  const handleConfirmStop = useCallback(() => {
    exitVoiceMode();
    setShowStopConfirm(false);
  }, [exitVoiceMode]);

  // Simple mic recording (non-voice-mode, just transcribe to input)
  const handleMicRecord = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');
        try {
          const res = await fetch('/api/transcribe', { method: 'POST', credentials: 'include', body: formData });
          const data = await res.json();
          if (data.text) setInput((prev) => prev + (prev ? ' ' : '') + data.text);
        } catch {}
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch {}
  }, [isRecording]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(input); }
  }, [doSend, input]);

  // ===== VOICE MODE UI =====
  if (isVoiceMode) {
    const stateLabel = voiceState === 'listening' ? 'Ecoute...'
      : voiceState === 'processing' ? 'Transcription...'
      : voiceState === 'speaking' ? 'Reponse...'
      : 'Pret';

    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#060b18] relative">
        {/* Close button */}
        <button
          onClick={() => setShowStopConfirm(true)}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors z-10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Vortex */}
        <div
          className="relative cursor-pointer select-none"
          onClick={handleVortexTap}
        >
          {/* Outer rings */}
          <div className={`absolute inset-0 rounded-full transition-all duration-700 ${
            voiceState === 'listening' ? 'scale-[1.6] bg-[#0d9488]/10 animate-pulse' :
            voiceState === 'processing' ? 'scale-[1.4] bg-[#c4a35a]/10 animate-pulse' :
            voiceState === 'speaking' ? 'scale-[1.5] bg-[#0d9488]/15 animate-pulse' :
            'scale-[1.3] bg-white/5'
          }`} style={{ width: 160, height: 160, margin: -20 }} />

          <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
            voiceState === 'listening' ? 'scale-[1.3] bg-[#0d9488]/15' :
            voiceState === 'processing' ? 'scale-[1.2] bg-[#c4a35a]/15' :
            voiceState === 'speaking' ? 'scale-[1.25] bg-[#0d9488]/20' :
            'scale-[1.1] bg-white/5'
          }`} style={{ width: 140, height: 140, margin: -10 }} />

          {/* Core circle */}
          <div className={`w-[120px] h-[120px] rounded-full flex items-center justify-center transition-all duration-500 ${
            voiceState === 'listening' ? 'bg-gradient-to-br from-[#0d9488] to-[#0b8278] shadow-lg shadow-[#0d9488]/30' :
            voiceState === 'processing' ? 'bg-gradient-to-br from-[#c4a35a] to-[#b8963a] shadow-lg shadow-[#c4a35a]/30' :
            voiceState === 'speaking' ? 'bg-gradient-to-br from-[#0d9488] to-[#14b8a6] shadow-lg shadow-[#0d9488]/40' :
            'bg-gradient-to-br from-[#1a2744] to-[#0f1a2e] border border-white/10'
          }`}>
            {voiceState === 'listening' ? (
              <div className="flex gap-1.5 items-end">
                <div className="w-1.5 bg-white/80 rounded-full animate-bounce" style={{ height: 20, animationDelay: '0s' }} />
                <div className="w-1.5 bg-white/80 rounded-full animate-bounce" style={{ height: 30, animationDelay: '0.15s' }} />
                <div className="w-1.5 bg-white/80 rounded-full animate-bounce" style={{ height: 24, animationDelay: '0.3s' }} />
                <div className="w-1.5 bg-white/80 rounded-full animate-bounce" style={{ height: 16, animationDelay: '0.45s' }} />
              </div>
            ) : voiceState === 'processing' ? (
              <div className="w-8 h-8 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
            ) : voiceState === 'speaking' ? (
              <svg className="w-10 h-10 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8.8l4.7-3.5c.7-.5 1.6-.1 1.6.8v11.8c0 .9-.9 1.3-1.6.8L6.5 15.2H4c-.6 0-1-.4-1-1v-4.4c0-.6.4-1 1-1h2.5z" />
              </svg>
            ) : (
              <svg className="w-10 h-10 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </div>
        </div>

        {/* State label */}
        <p className="mt-6 text-sm text-white/50">{stateLabel}</p>
        <p className="mt-1 text-[10px] text-white/20">Double-tap pour arreter</p>

        {/* Transcription */}
        <div className="absolute bottom-6 left-4 right-4 text-center safe-bottom">
          {lastUserText && (
            <p className="text-white/40 text-sm mb-1 line-clamp-2">
              <span className="text-white/20">Vous:</span> {lastUserText}
            </p>
          )}
          {lastAiText && (
            <p className="text-white/50 text-sm line-clamp-3">
              <span className="text-white/20">IA:</span> {lastAiText.slice(0, 150)}{lastAiText.length > 150 ? '...' : ''}
            </p>
          )}
        </div>

        {/* Stop confirm modal */}
        {showStopConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#0f1729] rounded-2xl p-6 mx-4 max-w-sm w-full border border-white/10 shadow-2xl animate-fade-in">
              <h3 className="text-lg font-bold mb-2 text-white">Arreter la conversation vocale ?</h3>
              <p className="text-white/50 text-sm mb-4">Vous pouvez reprendre a tout moment.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowStopConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-medium transition-colors"
                >
                  Continuer
                </button>
                <button
                  onClick={handleConfirmStop}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium transition-colors"
                >
                  Arreter
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== WELCOME SCREEN =====
  if (!conversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 sm:px-6">
        <div className="text-center max-w-md w-full animate-fade-in">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#0d9488]/30 to-[#0d7377]/10 animate-pulse-ring" />
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-[#0d9488]/40 to-[#0d7377]/20 animate-pulse-ring" style={{ animationDelay: '0.7s' }} />
            <div className="absolute inset-8 rounded-full bg-gradient-to-br from-[#0d9488] to-[#0d7377] flex items-center justify-center shadow-lg shadow-[#0d9488]/20">
              <img src="/ltdd-logo.png" alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            <span className="text-[#0d9488]">Le Temps</span>{' '}
            <span className="text-[#c4a35a]">de Dieu</span>
          </h1>
          <p className="text-white/40 text-sm mb-8">Specialiste en etudes islamiques et religion comparee</p>

          <div className="flex gap-3 justify-center">
            <button onClick={onCreateConversation}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#0d9488] to-[#0d7377] text-white font-medium hover:shadow-lg transition-all active:scale-95">
              Nouvelle conversation
            </button>
            <button onClick={handleEnterVoice}
              className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium transition-all active:scale-95 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Mode vocal
            </button>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-2">
            {['Qui est le prophete Mohamed ?', 'Les sources du Coran', 'Hadiths authentiques', 'Analyse critique'].map((s) => (
              <button key={s} onClick={() => { onCreateConversation(); setTimeout(() => setInput(s), 100); }}
                className="px-3 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 text-white/40 text-xs text-left transition-all active:scale-[0.98] leading-relaxed">
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ===== CHAT MODE =====
  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y px-2 sm:px-4 md:px-8 lg:px-12 py-4">
        <div className="max-w-3xl mx-auto w-full">
          {conversation.messages.map((msg, i) => (
            <Message key={i} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>


      {/* Mobile FAB for new conversation */}
      <button
        onClick={onCreateConversation}
        className="md:hidden fixed bottom-24 right-4 z-20 w-12 h-12 rounded-full bg-[#0d9488] hover:bg-[#0b8278] text-white shadow-lg shadow-[#0d9488]/30 flex items-center justify-center active:scale-95 transition-all"
        title="Nouvelle conversation"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Input bar */
      <div className="border-t border-white/10 bg-[#060b18] px-2 sm:px-4 md:px-8 lg:px-12 py-2 sm:py-4 safe-bottom">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-1.5 sm:gap-2 bg-[#0f1a2e] rounded-2xl border border-white/10 focus-within:border-[#0d9488]/40 px-2 sm:px-4 py-2 transition-colors">
            {/* Voice mode button */}
            <button
              onClick={handleEnterVoice}
              className="p-2 sm:p-3 rounded-full bg-gradient-to-br from-[#c4a35a] to-[#d4af37] hover:from-[#d4af37] hover:to-[#e6c048] text-[#0a0a0a] flex-shrink-0 transition-all active:scale-95 shadow-md shadow-[#c4a35a]/20 hover:shadow-lg hover:shadow-[#c4a35a]/30"
              title="Mode vocal"
            >
              <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8.8l4.7-3.5c.7-.5 1.6-.1 1.6.8v11.8c0 .9-.9 1.3-1.6.8L6.5 15.2H4c-.6 0-1-.4-1-1v-4.4c0-.6.4-1 1-1h2.5z" />
              </svg>
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ecrivez votre message..."
              rows={1}
              disabled={isStreaming}
              className="flex-1 min-w-0 resize-none bg-transparent text-sm sm:text-[15px] text-white placeholder-white/30 outline-none py-1.5 disabled:opacity-50"
              style={{ maxHeight: '120px' }}
            />

            {/* Mic record (for dictation into text) */}
            <button
              onClick={handleMicRecord}
              className={`p-2 sm:p-2.5 rounded-full flex-shrink-0 transition-all ${
                isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-[#0d9488] hover:bg-[#0b8278] text-white'
              }`}
              title={isRecording ? 'Arreter' : 'Dicter'}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>

            {/* Send / Stop */}
            {isStreaming ? (
              <button onClick={handleAbort}
                className="p-2 sm:p-2.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 flex-shrink-0 transition-all">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
              </button>
            ) : (
              <button onClick={() => doSend(input)} disabled={!input.trim()}
                className="p-2 sm:p-2.5 rounded-full bg-[#0d9488] hover:bg-[#0b8278] text-white disabled:opacity-30 flex-shrink-0 transition-all active:scale-95">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {isStreaming && (
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0d9488] animate-bounce" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#0d9488] animate-bounce" style={{ animationDelay: '0.15s' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#0d9488] animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
              <span className="text-[10px] text-white/30">Reflexion en cours...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
