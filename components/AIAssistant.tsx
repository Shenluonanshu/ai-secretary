"use client";
import type { EventDraft } from "@/lib/types";

interface AIAssistantProps {
  prompt: string;
  onPromptChange: (v: string) => void;
  onParse: (source: "text" | "voice") => void;
  candidate: EventDraft | null;
  onCancelCandidate: () => void;
  onConfirmCandidate: () => void;
  listening: boolean;
  onToggleVoice: () => void;
  fmtDate: (s: string, allDay?: boolean) => string;
}

export function AIAssistant({
  prompt,
  onPromptChange,
  onParse,
  candidate,
  onCancelCandidate,
  onConfirmCandidate,
  listening,
  onToggleVoice,
  fmtDate,
}: AIAssistantProps) {
  return (
    <article className="panel assistant">
      <div className="panel-head">
        <div>
          <span className="eyebrow">AI 快速录入</span>
          <h2>告诉我你的安排</h2>
        </div>
        <span className="status">规则校验已开启</span>
      </div>
      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder="例如：明天下午三点和产品组开会，提前一小时提醒我"
      />
      <div className="inline-actions">
        <button className="primary" onClick={() => onParse("text")}>
          生成事件
        </button>
        <button
          className={listening ? "primary" : "ghost"}
          onClick={onToggleVoice}
        >
          {listening ? "● 正在聆听，点击结束" : "⌁ 开始语音输入"}
        </button>
        <span>语音与文字结果都需要确认后保存</span>
      </div>
      {candidate && (
        <div className="candidate">
          <div>
            <b>{candidate.title}</b>
            <small>
              {fmtDate(candidate.startsAt, candidate.allDay)} · 提前 {candidate.reminders[0]} 分钟
            </small>
          </div>
          <div>
            <button className="ghost" onClick={onCancelCandidate}>
              取消
            </button>
            <button className="primary" onClick={onConfirmCandidate}>
              确认保存
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
