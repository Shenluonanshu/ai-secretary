"use client";
import { useRouter } from "next/navigation";
import { clearToken } from "@/lib/api";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  currentPage: string;
  onExport?: () => void;
}

export function Drawer({ open, onClose, currentPage, onExport }: DrawerProps) {
  const router = useRouter();

  function navigate(href: string) {
    router.push(href);
    onClose();
  }

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <>
      <div
        className={`drawer-overlay ${open ? "open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`drawer-panel ${open ? "open" : ""}`} role="navigation" aria-label="侧边菜单">
        <div className="drawer-head">
          <div className="logo">
            知行<span>·</span>
          </div>
        </div>

        <nav className="drawer-nav">
          <button
            className={currentPage === "chat" ? "active" : ""}
            onClick={() => navigate("/")}
          >
            <span className="nav-icon">💬</span> AI 对话
          </button>
          <button
            className={currentPage === "calendar" ? "active" : ""}
            onClick={() => navigate("/calendar")}
          >
            <span className="nav-icon">📅</span> 日程中心
          </button>
          <button
            className={currentPage === "settings" ? "active" : ""}
            onClick={() => navigate("/settings")}
          >
            <span className="nav-icon">⚙</span> 设置
          </button>
          <button
            className={currentPage === "privacy" ? "active" : ""}
            onClick={() => navigate("/privacy")}
          >
            <span className="nav-icon">🔒</span> 隐私政策
          </button>
          {onExport && (
            <button onClick={onExport}>
              <span className="nav-icon">📊</span> 数据总览
            </button>
          )}
        </nav>

        <div className="drawer-footer">
          <button
            onClick={handleLogout}
            style={{
              width: "100%", padding: "8px", border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)", background: "transparent",
              color: "var(--red)", cursor: "pointer", fontSize: 13,
            }}
          >
            退出登录
          </button>
          <div className="version" style={{ textAlign: "center", marginTop: 8 }}>
            v2.0.0 · 知行 AI 秘书
          </div>
        </div>
      </aside>
    </>
  );
}
