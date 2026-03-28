import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Conversation, Message as MessageType } from '../App';
import MessageBubble from './Message';
import VoiceButton from './VoiceButton';
import { streamChat } from '../api/chat';
import { useVoiceChat } from '../hooks/useVoiceChat';

interface ChatPageProps {
  conversation: Conversation | null;
  selectedModel: string;
  onCreateConversation: () => void;
  onUpdateConversation: (id: string, updater: (c: Conversation) => Conversation) => void;
  onUpdateRemaining?: (remaining: number) => void;
}

export default function ChatPage({ conversation, selectedModel, onCreateConversation, onUpdateConversation, onUpdateRemaining }: ChatPageProps) {
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingVoiceSendRef = useRef(false);
  const pendingInputRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    isVoiceMode,
    voiceState,
    isSupported,
    lastUserText,
    lastAiText,
    enterVoiceMode,
    exitVoiceMode,
    speakText,
    stopSpeaking,
  } = useVoiceChat();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages, scrollToBottom]);

  // Track scroll position to show/hide scroll-to-bottom button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollButton(distanceFromBottom > 150);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Abort streaming on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Auto-send pending input after conversation is created (fixes message loss on new conversation)
  useEffect(() => {
    if (conversation?.id && pendingInputRef.current !== null) {
      const text = pendingInputRef.current;
      pendingInputRef.current = null;
      handleSend(text);
    }
  }, [conversation?.id]);

  const handleAbort = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text) return;

    // Confirm before sending if streaming is active
    if (isStreaming) {
      const confirmed = window.confirm('Un message est en cours de generation. Voulez-vous interrompre et envoyer un nouveau message ?');
      if (!confirmed) return;
      abortControllerRef.current?.abort();
    }

    setLimitError(null);

    let convId = conversation?.id;

    if (!convId) {
      // Save text to ref so it auto-sends after conversation creation
      pendingInputRef.current = text;
      setInput('');
      onCreateConversation();
      return;
    }

    const userMessage: MessageType = { id: crypto.randomUUID(), role: 'user', content: text };

    onUpdateConversation(convId, (c) => ({
      ...c,
      title: c.messages.length === 0 ? text.slice(0, 40) : c.title,
      messages: [...c.messages, userMessage],
      model: selectedModel,
    }));

    setInput('');
    setIsStreaming(true);

    // Return focus to textarea after sending
    setTimeout(() => textareaRef.current?.focus(), 0);

    // Create AbortController for this stream
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const assistantMessage: MessageType = { id: crypto.randomUUID(), role: 'assistant', content: '' };
    onUpdateConversation(convId, (c) => ({
      ...c,
      messages: [...c.messages, assistantMessage],
    }));

    let fullContent = '';

    try {
      const allMessages = [...(conversation?.messages ?? []), userMessage];
      const reader = await streamChat(selectedModel, allMessages, isVoiceMode, controller.signal);

      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.remaining !== undefined && onUpdateRemaining) {
                onUpdateRemaining(parsed.remaining);
                continue;
              }
              const delta = parsed.content || parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
                const capturedContent = fullContent;
                onUpdateConversation(convId!, (c) => {
                  const msgs = [...c.messages];
                  msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], role: 'assistant', content: capturedContent };
                  return { ...c, messages: msgs };
                });
              }
            } catch {}
          }
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      if ((err as Error)?.name === 'AbortError') {
        // User aborted - keep partial content
        if (!fullContent) {
          onUpdateConversation(convId, (c) => {
            const msgs = [...c.messages];
            if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant' && !msgs[msgs.length - 1].content) {
              msgs.pop();
            }
            return { ...c, messages: msgs };
          });
        }
      } else if (errorMessage.includes('403') || errorMessage.includes('daily_limit')) {
        setLimitError('Vous avez atteint votre limite de 5 messages par jour. Passez au plan Premium pour un acces illimite.');
        onUpdateConversation(convId, (c) => {
          const msgs = [...c.messages];
          if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant' && !msgs[msgs.length - 1].content) {
            msgs.pop();
          }
          return { ...c, messages: msgs };
        });
      } else if (errorMessage.includes('401')) {
        setLimitError('Votre session a expire. Veuillez vous reconnecter.');
        onUpdateConversation(convId, (c) => {
          const msgs = [...c.messages];
          if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant' && !msgs[msgs.length - 1].content) {
            msgs.pop();
          }
          return { ...c, messages: msgs };
        });
      } else {
        console.error('Stream error:', err);
        fullContent = "Desole, une erreur s'est produite. Veuillez reessayer.";
        onUpdateConversation(convId, (c) => {
          const msgs = [...c.messages];
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], role: 'assistant', content: fullContent };
          return { ...c, messages: msgs };
        });
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }

    if (isVoiceMode && fullContent) {
      await speakText(fullContent);
    }
  }, [input, isStreaming, conversation, selectedModel, onCreateConversation, onUpdateConversation, isVoiceMode, speakText, onUpdateRemaining]);

  useEffect(() => {
    if (pendingVoiceSendRef.current && input.trim()) {
      pendingVoiceSendRef.current = false;
      handleSend(input);
    }
  }, [input, handleSend]);

  const handleVoiceResult = useCallback((voiceText: string) => {
    setInput(voiceText);
    pendingVoiceSendRef.current = true;
  }, []);

  const handleToggleVoiceMode = useCallback(() => {
    if (isVoiceMode) {
      exitVoiceMode();
    } else {
      stopSpeaking();
      enterVoiceMode(handleVoiceResult);
    }
  }, [isVoiceMode, enterVoiceMode, exitVoiceMode, stopSpeaking, handleVoiceResult]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#0d7377]/20 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#c4a35a]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold">
            <span className="text-white">Bienvenue sur </span>
            <span className="text-[#0d9488]">Le Temps</span>{' '}
            <span className="text-[#c4a35a]">de Dieu</span>
          </h2>
          <p className="text-white/50 max-w-md">
            Commencez une nouvelle conversation pour explorer la puissance de l'IA.
          </p>
          <button
            onClick={onCreateConversation}
            className="px-6 py-3 rounded-xl bg-[#0d7377] hover:bg-[#0b6163] text-white font-medium transition-colors"
          >
            Nouvelle conversation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {isVoiceMode ? (
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <button
            onClick={exitVoiceMode}
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white/60 transition z-10"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>

          <div className="relative">
            {voiceState === 'listening' && (
              <div className="w-32 h-32 rounded-full bg-teal-500/10 animate-pulse flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-teal-500/20 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-teal-500/30 flex items-center justify-center">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-3 bg-teal-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
                      <div className="w-1.5 h-5 bg-teal-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
                      <div className="w-1.5 h-4 bg-teal-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {voiceState === 'processing' && (
              <div className="w-32 h-32 rounded-full bg-amber-500/10 flex items-center justify-center">
                <div className="w-20 h-20 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin"/>
              </div>
            )}
            {voiceState === 'speaking' && (
              <div className="w-32 h-32 rounded-full bg-amber-500/10 flex items-center justify-center animate-pulse">
                <div className="w-24 h-24 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <div className="flex gap-1 items-end h-8">
                    <div className="w-1.5 bg-amber-400 rounded-full animate-bounce" style={{height:'40%',animationDelay:'0ms'}}/>
                    <div className="w-1.5 bg-amber-400 rounded-full animate-bounce" style={{height:'70%',animationDelay:'100ms'}}/>
                    <div className="w-1.5 bg-amber-400 rounded-full animate-bounce" style={{height:'100%',animationDelay:'200ms'}}/>
                    <div className="w-1.5 bg-amber-400 rounded-full animate-bounce" style={{height:'60%',animationDelay:'300ms'}}/>
                    <div className="w-1.5 bg-amber-400 rounded-full animate-bounce" style={{height:'80%',animationDelay:'400ms'}}/>
                  </div>
                </div>
              </div>
            )}
            {voiceState === 'idle' && (
              <div className="w-32 h-32 rounded-full bg-teal-500/5 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-teal-500/10"/>
              </div>
            )}
          </div>

          <div className="absolute bottom-8 left-0 right-0 text-center px-8">
            {lastUserText && <p className="text-white/20 text-xs mb-1">Vous: {lastUserText.slice(0, 80)}</p>}
            {lastAiText && <p className="text-white/20 text-xs">IA: {lastAiText.slice(0, 80)}</p>}
          </div>
        </div>
      ) : (
        <>
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4 relative">
            {conversation.messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-white/30 text-lg">Envoyez un message pour commencer...</p>
              </div>
            )}
            {conversation.messages.map((msg) => (
              <MessageBubble key={msg.id || msg.content.slice(0, 20)} role={msg.role} content={msg.content} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom floating button */}
          {showScrollButton && (
            <div className="relative">
              <button
                onClick={scrollToBottom}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all shadow-lg"
                aria-label="Defiler vers le bas"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
            </div>
          )}

          {limitError && (
            <div className="shrink-0 mx-4 mb-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>{limitError}</span>
              <button onClick={() => setLimitError(null)} className="ml-auto text-amber-400 hover:text-amber-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <div className="shrink-0 p-4 border-t border-white/10 bg-[#060b18]/80 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
            <div className="max-w-3xl mx-auto flex items-end gap-1.5 sm:gap-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ecrivez votre message..."
                rows={1}
                className="flex-1 resize-none rounded-2xl bg-white/5 border border-white/10 px-5 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#0d7377] focus:ring-1 focus:ring-[#0d7377] transition-colors text-sm"
                disabled={false}
              />
              <VoiceButton
                isVoiceMode={isVoiceMode}
                isSupported={isSupported}
                onToggleVoiceMode={handleToggleVoiceMode}
              />
              {isStreaming ? (
                <button
                  onClick={handleAbort}
                  className="shrink-0 w-11 h-11 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors"
                  aria-label="Arreter la generation"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className="shrink-0 w-11 h-11 rounded-full bg-[#0d7377] hover:bg-[#0b6163] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  aria-label="Envoyer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
