"use client";
import type { EventDraft } from "@/lib/types";

interface EventFormProps {
  draft: EventDraft;
  editing: string | null;
  onUpdate: (key: keyof EventDraft, value: unknown) => void;
  onPersist: () => void;
  onCancelEdit: () => void;
}

export function EventForm({
  draft,
  editing,
  onUpdate,
  onPersist,
  onCancelEdit,
}: EventFormProps) {
  return (
    <article className="panel editor">
      <div className="panel-head">
        <div>
          <span className="eyebrow">{editing ? "编辑事件" : "手动创建"}</span>
          <h2>{editing ? "修改你的安排" : "添加一个新安排"}</h2>
        </div>
        {editing && (
          <button className="ghost" onClick={onCancelEdit}>
            取消编辑
          </button>
        )}
      </div>
      <div className="field-grid">
        <label>
          标题
          <input
            value={draft.title}
            onChange={(e) => onUpdate("title", e.target.value)}
            placeholder="例如：产品例会"
          />
        </label>
        <label>
          提醒
          <select
            value={draft.reminders[0]}
            onChange={(e) => onUpdate("reminders", [+e.target.value])}
          >
            <option value="10">提前 10 分钟</option>
            <option value="30">提前 30 分钟</option>
            <option value="60">提前 1 小时</option>
            <option value="1440">提前 1 天</option>
          </select>
        </label>
        <label>
          开始时间
          <input
            type="datetime-local"
            value={draft.startsAt}
            onChange={(e) => onUpdate("startsAt", e.target.value)}
          />
        </label>
        <label>
          结束时间
          <input
            type="datetime-local"
            value={draft.endsAt}
            onChange={(e) => onUpdate("endsAt", e.target.value)}
          />
        </label>
        <label>
          重复
          <select
            value={draft.recurrence}
            onChange={(e) => onUpdate("recurrence", e.target.value)}
          >
            <option value="none">不重复</option>
            <option value="daily">每天</option>
            <option value="weekly">每周</option>
            <option value="monthly">每月</option>
          </select>
        </label>
        <label>
          备注
          <input
            value={draft.description || ""}
            onChange={(e) => onUpdate("description", e.target.value)}
            placeholder="可选备注"
          />
        </label>
      </div>
      <button className="primary" onClick={onPersist}>
        {editing ? "保存修改" : "保存事件"}
      </button>
    </article>
  );
}
