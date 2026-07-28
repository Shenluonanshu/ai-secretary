"use client";

interface ChatHeaderProps {
  onMenuToggle: () => void;
  onMoreToggle: () => void;
  online?: boolean;
}

export function ChatHeader({ onMenuToggle, onMoreToggle, online = true }: ChatHeaderProps) {
  return (
    <header className="chat-header">
      <button
        className="menu-btn"
        onClick={onMenuToggle}
        aria-label="打开菜单"
      >
        ☰
      </button>
      <div className="title">
        <span className="status-dot" style={{ background: online ? "var(--green)" : "var(--muted)" }} />
        AI 秘书
      </div>
      <button
        className="more-btn"
        onClick={onMoreToggle}
        aria-label="更多选项"
      >
        ⋯
      </button>
    </header>
  );
}
