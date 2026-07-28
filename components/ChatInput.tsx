"use client";
import { useRef, useEffect, useState, type KeyboardEvent } from "react";

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onVoiceToggle: () => void;
  isListening: boolean;
  isProcessing: boolean;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onVoiceToggle,
  isListening,
  isProcessing,
  placeholder = "告诉 AI 秘书你想做什么…",
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 100) + "px";
  }, [value]);

  // Refocus after send
  useEffect(() => {
    if (!isProcessing && value === "") {
      textareaRef.current?.focus();
    }
  }, [isProcessing, value]);

  // Keyboard-aware positioning (iOS visualViewport)
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const handler = () => {
      const vh = window.visualViewport?.height || window.innerHeight;
      const winH = window.innerHeight;
      const diff = winH - vh;
      setKeyboardHeight(diff > 100 ? diff : 0);
    };
    window.visualViewport.addEventListener("resize", handler);
    window.visualViewport.addEventListener("scroll", handler);
    return () => {
      window.visualViewport?.removeEventListener("resize", handler);
      window.visualViewport?.removeEventListener("scroll", handler);
    };
  }, []);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isProcessing) onSend();
    }
  }

  const canSend = value.trim().length > 0 && !isProcessing;

  return (
    <div className="chat-input-bar" role="form" aria-label="消息输入"
      style={keyboardHeight > 0 ? { paddingBottom: `calc(${keyboardHeight}px - var(--safe-bottom))` } : undefined}
    >
      <button
        className={`voice-btn ${isListening ? "listening" : ""}`}
        onClick={onVoiceToggle}
        aria-label={isListening ? "停止语音" : "开始语音"}
        title={isListening ? "停止录音" : "语音输入"}
      >
        {isListening ? "⏹" : "🎤"}
      </button>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isListening ? "正在聆听…" : placeholder}
        rows={1}
        aria-label="输入消息"
        disabled={isProcessing}
      />

      <button
        className={`send-btn ${canSend ? "active" : ""}`}
        onClick={onSend}
        disabled={!canSend}
        aria-label="发送"
      >
        ↑
      </button>
    </div>
  );
}
