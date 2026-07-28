"use client";
import { useEffect, useState } from "react";

const ONBOARD_KEY = "onboarding_completed";

const steps = [
  {
    title: "欢迎使用 AI 秘书 👋",
    text: "我是你的个人助理，可以直接用自然语言和我对话。试试输入下面的话👇",
  },
  {
    title: "📅 安排日程",
    text: "说「明天下午三点开会，提前半小时提醒」，我就会帮你创建日程并设置提醒。",
  },
  {
    title: "✅ 记待办 & 🏃 打卡习惯",
    text: "说「记一下，下班买牛奶」来记待办，说「跑步打卡」来记录习惯。",
  },
];

export function OnboardingGuide() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARD_KEY);
    if (!done) {
      // Delay slightly so the page renders first
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  function next() {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  }

  function dismiss() {
    setVisible(false);
    localStorage.setItem(ONBOARD_KEY, "true");
  }

  if (!visible) return null;

  const s = steps[step];

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 340, textAlign: "center" }}>
        <h2>{s.title}</h2>
        <p style={{ fontSize: 14, lineHeight: 1.7, margin: "12px 0 20px" }}>
          {s.text}
        </p>

        {/* Dots indicator */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16 }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                width: 8, height: 8, borderRadius: "50%",
                background: i === step ? "var(--blue)" : "var(--line)",
                transition: ".2s",
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={dismiss} style={{ flex: 1, fontSize: 12 }}>
            跳过
          </button>
          <button className="btn btn-primary" onClick={next} style={{ flex: 1, fontSize: 12 }}>
            {step === steps.length - 1 ? "开始使用 🚀" : "下一步 →"}
          </button>
        </div>
      </div>
    </div>
  );
}
