"use client";

interface NavItem {
  label: string;
  icon: string;
  href: string;
}

const items: NavItem[] = [
  { label: "总览", icon: "▦", href: "#top" },
  { label: "日程", icon: "◷", href: "#calendar" },
  { label: "语音", icon: "⌁", href: "#voice" },
  { label: "行程", icon: "✦", href: "#planner" },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <a key={item.href} href={item.href} className="bottom-nav-item">
          <span className="bottom-nav-icon">{item.icon}</span>
          <span className="bottom-nav-label">{item.label}</span>
        </a>
      ))}
    </nav>
  );
}
