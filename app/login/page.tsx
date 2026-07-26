"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { setToken } from "@/lib/api";

export default function LoginPage() {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passphrase.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "登录失败");
        return;
      }
      setToken(data.token);
      router.push("/");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f6f7fb",
        fontFamily: 'Inter,"Microsoft YaHei",system-ui,sans-serif',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#fff",
          padding: "40px 32px",
          borderRadius: 16,
          border: "1px solid #e9edf4",
          width: "min(360px, 90vw)",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 850, margin: "0 0 6px", letterSpacing: "-0.5px" }}>
          知行<span style={{ color: "#aeb7ff" }}>·</span>
        </h1>
        <p style={{ color: "#758097", fontSize: 13, margin: "0 0 24px" }}>
          AI 秘书 · 登录
        </p>
        <input
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="输入访问密码"
          autoFocus
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #dfe4ee",
            borderRadius: 8,
            fontSize: 14,
            outline: "none",
            marginBottom: error ? 8 : 16,
          }}
        />
        {error && (
          <p style={{ color: "#c54b58", fontSize: 12, margin: "0 0 12px" }}>{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px",
            background: "#4a5be7",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 650,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "验证中..." : "进入"}
        </button>
      </form>
    </main>
  );
}
