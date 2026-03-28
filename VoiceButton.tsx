import React from 'react';

interface VoiceButtonProps {
  isVoiceMode: boolean;
  isSupported: boolean;
  onToggleVoiceMode: () => void;
}

export default function VoiceButton({ isVoiceMode, isSupported, onToggleVoiceMode }: VoiceButtonProps) {
  if (!isSupported) {
    return (
      <button
        disabled
        title="Micro non supporte"
        className="shrink-0 w-11 h-11 rounded-full bg-white/10 flex items-center justify-center opacity-40 cursor-not-allowed"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={onToggleVoiceMode}
      className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all ${
        isVoiceMode
          ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 animate-pulse'
          : 'bg-gradient-to-br from-[#c4a35a] to-[#d4af37] hover:from-[#d4af37] hover:to-[#e6c048] shadow-md shadow-[#c4a35a]/20 hover:shadow-lg hover:shadow-[#c4a35a]/30'
      }`}
      title={isVoiceMode ? 'Arreter le mode vocal' : 'Mode vocal'}
    >
      {isVoiceMode ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#0a0a0a]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8.8l4.7-3.5c.7-.5 1.6-.1 1.6.8v11.8c0 .9-.9 1.3-1.6.8L6.5 15.2H4c-.6 0-1-.4-1-1v-4.4c0-.6.4-1 1-1h2.5z" />
        </svg>
      )}
    </button>
  );
}
