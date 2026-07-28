"use client";
import { useRef, useEffect, type KeyboardEvent } from "react";

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

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isProcessing) onSend();
    }
  }

  const canSend = value.trim().length > 0 && !isProcessing;

  return (
    <div className="chat-input-bar" role="form" aria-label="消息输入">
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
