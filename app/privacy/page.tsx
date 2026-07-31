export const dynamic = "force-static";

export default function PrivacyPage() {
  return (
    <div className="page-shell">
      <div className="page-head">
        <a className="back-btn" href="/" aria-label="返回">
          ←
        </a>
        <h1>隐私政策</h1>
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.8, color: "var(--ink-soft)" }}>
        <p><strong>最后更新：2026年7月31日</strong></p>

        <h3 style={{ marginTop: 20, color: "var(--ink)" }}>1. 信息收集</h3>
        <p>
          知行 AI 秘书仅收集您主动输入的日程、待办事项等信息。这些数据存储在
          Cloudflare D1 数据库中。
        </p>
        <p>我们不会收集您的个人信息、位置信息或设备信息用于分析或广告目的。</p>

        <h3 style={{ marginTop: 16, color: "var(--ink)" }}>2. 数据使用</h3>
        <p>
          您的日程数据仅用于为您提供日程管理、提醒和 AI 解析服务。当您使用 AI 解析功能时，
          您输入的文字内容会被发送到您配置的 AI 服务商（如 DeepSeek 等）进行处理。
        </p>
        <p>除此之外，您的数据不会与任何第三方共享。</p>

        <h3 style={{ marginTop: 16, color: "var(--ink)" }}>3. 数据存储</h3>
        <p>数据存储在 Cloudflare D1 数据库中。您可以随时通过设置页面导出或删除您的数据。</p>

        <h3 style={{ marginTop: 16, color: "var(--ink)" }}>4. 数据安全</h3>
        <p>所有数据传输均通过 HTTPS 加密。API 访问需要 JWT 令牌认证。</p>

        <h3 style={{ marginTop: 16, color: "var(--ink)" }}>5. 联系我们</h3>
        <p>如有任何隐私相关问题，请通过应用内反馈功能联系我们。</p>
      </div>
    </div>
  );
}
