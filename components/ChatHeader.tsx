"use client";

interface ChatHeaderProps {
  onMenuToggle: () => void;
  onMoreToggle: () => void;
  online?: boolean;
  title?: string;
}

export function ChatHeader({ onMenuToggle, onMoreToggle, online = true, title = "AI 秘书" }: ChatHeaderProps) {
  return (
    <header className="chat-header">
      <button className="menu-btn" onClick={onMenuToggle} aria-label="打开菜单">☰</button>
      <div className="title">
        <span className="status-dot" style={{ background: online ? "var(--green)" : "var(--muted)" }} />
        {title}
      </div>
      <button className="more-btn" onClick={onMoreToggle} aria-label="更多选项">⋯</button>
    </header>
  );
}
