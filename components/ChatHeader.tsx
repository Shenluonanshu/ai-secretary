"use client";
import { useState, useRef, useEffect } from "react";

interface ChatHeaderProps {
  onMenuToggle: () => void;
  onExport: () => void;
  online?: boolean;
  title?: string;
}

export function ChatHeader({ onMenuToggle, onExport, online = true, title = "AI 秘书" }: ChatHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [menuOpen]);

  return (
    <header className="chat-header">
      <button className="menu-btn" onClick={onMenuToggle} aria-label="打开菜单">☰</button>
      <div className="title">
        <span className="status-dot" style={{ background: online ? "var(--green)" : "var(--muted)" }} />
        {title}
      </div>
      <div ref={ref} style={{ position: "relative" }}>
        <button
          className="more-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="更多选项"
          title="导出 / 设置"
        >
          📥
        </button>
        {menuOpen && (
          <div
            style={{
              position: "absolute", top: "100%", right: 0, marginTop: 4,
              background: "var(--paper)", border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-md)",
              minWidth: 140, zIndex: 15, overflow: "hidden",
            }}
          >
            <button
              onClick={() => { onExport(); setMenuOpen(false); }}
              style={{
                display: "block", width: "100%", padding: "10px 14px",
                background: "transparent", border: 0, cursor: "pointer",
                fontSize: 13, textAlign: "left", color: "var(--ink-soft)",
              }}
            >
              📥 导出数据
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
