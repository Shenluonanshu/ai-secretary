"use client";

interface HeaderProps {
  onExport: () => void;
  onRequestPermission: () => void;
}

export function Header({ onExport, onRequestPermission }: HeaderProps) {
  const now = new Date();
  return (
    <header className="header">
      <div>
        <span className="eyebrow">PERSONAL TIME OS</span>
        <h1>早上好，今天也从容一点。</h1>
        <p>{new Intl.DateTimeFormat("zh-CN", { dateStyle: "full" }).format(now)}</p>
      </div>
      <div className="header-actions">
        <button className="ghost" onClick={onExport}>
          导出数据
        </button>
        <button
          className="primary"
          onClick={onRequestPermission}
        >
          开启提醒
        </button>
      </div>
    </header>
  );
}
