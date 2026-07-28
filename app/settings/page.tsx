"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/Drawer";
import { Toast } from "@/components/Toast";

export default function SettingsPage() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [theme, setTheme] = useState("system");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "system";
    setTheme(saved);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  function handleThemeChange(t: string) {
    setTheme(t);
    localStorage.setItem("theme", t);
    if (t === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else if (t === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.setAttribute("data-theme", "system");
    }
    setNotice("主题已切换");
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/events");
      const events = await res.json();
      const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ai-secretary-export-${new Date().toLocaleDateString("en-CA")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice("数据已导出");
    } catch {
      setNotice("导出失败，请重试");
    } finally {
      setExporting(false);
    }
  }

  function handleClearChat() {
    localStorage.removeItem("chat_messages");
    setNotice("对话记录已清除");
  }

  return (
    <div className="page-shell">
      <div className="page-head">
        <button className="back-btn" onClick={() => router.push("/")} aria-label="返回">
          ←
        </button>
        <h1>设置</h1>
        <button className="back-btn" onClick={() => setDrawerOpen(true)} aria-label="菜单" style={{ marginLeft: "auto" }}>
          ☰
        </button>
      </div>

      <div className="settings-section">
        <h3>外观</h3>
        <div className="settings-row">
          <span>主题模式</span>
          <select value={theme} onChange={(e) => handleThemeChange(e.target.value)}>
            <option value="system">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </div>
      </div>

      <div className="settings-section">
        <h3>数据</h3>
        <div className="settings-row">
          <span>导出日程数据</span>
          <button className="btn btn-primary" onClick={handleExport} disabled={exporting} style={{ fontSize: 12, padding: "5px 10px" }}>
            {exporting ? "导出中…" : "导出 JSON"}
          </button>
        </div>
        <div className="settings-row">
          <span>清除对话记录</span>
          <button className="btn btn-ghost" onClick={handleClearChat} style={{ fontSize: 12, color: "var(--red)" }}>
            清除
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h3>关于</h3>
        <div className="settings-row">
          <span>版本</span>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>v2.0.0</span>
        </div>
        <div className="settings-row">
          <span>开发者</span>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>知行团队</span>
        </div>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} currentPage="settings" />
      <Toast message={notice} />
    </div>
  );
}
