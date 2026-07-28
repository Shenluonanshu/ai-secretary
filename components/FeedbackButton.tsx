"use client";
import { useState } from "react";
import { authFetch } from "@/lib/api";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    if (rating === 0) return;
    setSending(true);
    try {
      await authFetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rating, message }),
      });
      setSent(true);
      setTimeout(() => {
        setOpen(false);
        setSent(false);
        setRating(0);
        setMessage("");
      }, 2000);
    } catch {
      // Silently fail
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        className="feedback-fab"
        onClick={() => setOpen(true)}
        aria-label="反馈"
        title="反馈"
        style={{ display: open ? "none" : "grid" }}
      >
        💬
      </button>

      {/* Modal */}
      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
            {sent ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 40 }}>🙏</div>
                <p style={{ marginTop: 8 }}>感谢你的反馈！</p>
              </div>
            ) : (
              <>
                <h2>反馈一下</h2>
                <p>帮助我们做得更好</p>

                <div className="stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} className={n <= rating ? "active" : ""} onClick={() => setRating(n)}>
                      ★
                    </button>
                  ))}
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="说说你的想法…（选填）"
                  rows={3}
                />

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button className="btn btn-ghost" onClick={() => setOpen(false)} style={{ flex: 1 }}>
                    取消
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={rating === 0 || sending}
                    style={{ flex: 1 }}
                  >
                    {sending ? "发送中…" : "提交"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
