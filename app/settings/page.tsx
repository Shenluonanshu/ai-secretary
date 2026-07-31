"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, getUserLLMConfig, setUserLLMConfig, hasUserLLMConfig } from "@/lib/api";
import { Drawer } from "@/components/Drawer";
import { Toast } from "@/components/Toast";

export default function SettingsPage() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [theme, setTheme] = useState("system");
  const [exporting, setExporting] = useState(false);

  // ── AI 配置状态 ──
  const [apiKey, setApiKey] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("https://api.deepseek.com/v1");
  const [apiModel, setApiModel] = useState("deepseek-chat");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "system";
    setTheme(saved);

    // 加载已保存的 API 配置
    const config = getUserLLMConfig();
    if (config) {
      setApiKey(config.apiKey);
      setApiBaseUrl(config.baseUrl);
      setApiModel(config.model);
      setHasApiKey(true);
    }
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

  function handleSaveApiKey() {
    if (!apiKey.trim()) {
      setUserLLMConfig(null);
      setHasApiKey(false);
      setNotice("API Key 已清除，将使用免费 AI 模型");
    } else {
      setUserLLMConfig({
        apiKey: apiKey.trim(),
        baseUrl: apiBaseUrl.trim() || "https://api.deepseek.com/v1",
        model: apiModel.trim() || "deepseek-chat",
      });
      setHasApiKey(true);
      setNotice("API Key 已保存（仅存储在你的浏览器中）");
    }
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

      {/* ── AI 模型配置 ── */}
      <div className="settings-section">
        <h3>AI 模型</h3>
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
          默认使用 Cloudflare 免费 AI 模型。
          你也可以填入自己的 API Key 以使用更好的模型（如 DeepSeek）。
          Key 仅存储在你的浏览器中，不会上传到服务器。
        </p>
        {hasApiKey && !showApiKey && (
          <div style={{ marginBottom: 12, padding: "8px 12px", background: "var(--green-soft)", borderRadius: "var(--radius-sm)", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>✅ 已配置 API Key（{apiModel}）</span>
            <button className="btn btn-ghost" onClick={() => setShowApiKey(true)} style={{ fontSize: 12 }}>修改</button>
          </div>
        )}
        {(showApiKey || !hasApiKey) && (
          <>
            <div className="settings-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>API Key</span>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>DeepSeek / OpenAI 兼容</span>
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-xxxxxxxxxxxxxxxx"
                style={{
                  width: "100%", padding: "8px 12px", border: "1px solid var(--line)",
                  borderRadius: "var(--radius-sm)", fontSize: 13, background: "var(--paper)",
                  color: "var(--ink)",
                }}
              />
            </div>
            <div className="settings-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
              <span>API 地址</span>
              <input
                type="text"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder="https://api.deepseek.com/v1"
                style={{
                  width: "100%", padding: "8px 12px", border: "1px solid var(--line)",
                  borderRadius: "var(--radius-sm)", fontSize: 13, background: "var(--paper)",
                  color: "var(--ink)",
                }}
              />
            </div>
            <div className="settings-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
              <span>模型名称</span>
              <input
                type="text"
                value={apiModel}
                onChange={(e) => setApiModel(e.target.value)}
                placeholder="deepseek-chat"
                style={{
                  width: "100%", padding: "8px 12px", border: "1px solid var(--line)",
                  borderRadius: "var(--radius-sm)", fontSize: 13, background: "var(--paper)",
                  color: "var(--ink)",
                }}
              />
            </div>
            <button className="btn btn-primary" onClick={handleSaveApiKey} style={{ width: "100%", marginTop: 4 }}>
              {apiKey.trim() ? "保存" : "清除 Key（使用免费模型）"}
            </button>
          </>
        )}
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
          <span>导入数据</span>
          <button
            className="btn btn-ghost"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".json";
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                const text = await file.text();
                try {
                  const data = JSON.parse(text);
                  const res = await authFetch("/api/import", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(data),
                  });
                  const result = await res.json();
                  setNotice(res.ok ? `导入完成：${result.imported?.events || 0} 日程，${result.imported?.todos || 0} 待办` : "导入失败");
                } catch { setNotice("文件格式错误"); }
              };
              input.click();
            }}
            style={{ fontSize: 12 }}
          >
            导入 JSON
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
          <span>AI 后端</span>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            {hasApiKey ? `${apiModel}（自定义 Key）` : "Cloudflare Workers AI（免费）"}
          </span>
        </div>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} currentPage="settings" />
      <Toast message={notice} />
    </div>
  );
}
