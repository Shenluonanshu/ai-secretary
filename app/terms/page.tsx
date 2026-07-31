export const dynamic = "force-static";

export default function TermsPage() {
  return (
    <div className="page-shell">
      <div className="page-head">
        <a className="back-btn" href="/" aria-label="返回">
          ←
        </a>
        <h1>用户协议</h1>
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.8, color: "var(--ink-soft)" }}>
        <p><strong>最后更新：2026年7月31日</strong></p>

        <h3 style={{ marginTop: 20, color: "var(--ink)" }}>1. 服务说明</h3>
        <p>
          知行 AI 秘书是一款个人日程管理工具，提供自然语言日程创建、语音录入、
          AI 智能解析、提醒通知等功能。
        </p>

        <h3 style={{ marginTop: 16, color: "var(--ink)" }}>2. 使用条款</h3>
        <p>
          本应用仅供个人使用。您应确保输入的内容符合法律法规，不得利用本服务
          创建或传播违法信息。
        </p>

        <h3 style={{ marginTop: 16, color: "var(--ink)" }}>3. AI 服务说明</h3>
        <p>
          AI 解析功能可能由第三方 AI 服务商提供（如 DeepSeek 等）。
          使用 AI 功能即表示您同意将相关文本发送至对应的 AI 服务商进行处理。
        </p>

        <h3 style={{ marginTop: 16, color: "var(--ink)" }}>4. 免责声明</h3>
        <p>
          本应用按"现状"提供，开发者不对服务的可用性、准确性或完整性做任何保证。
          因使用本应用产生的任何损失，开发者不承担责任。
        </p>

        <h3 style={{ marginTop: 16, color: "var(--ink)" }}>5. 变更</h3>
        <p>我们保留随时更新本协议的权利。重大变更将通过应用内通知告知用户。</p>
      </div>
    </div>
  );
}
