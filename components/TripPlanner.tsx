"use client";
import type { TripItem } from "@/lib/types";

interface TripPlannerProps {
  destination: string;
  startDate: string;
  endDate: string;
  preference: string;
  onDestinationChange: (v: string) => void;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onPreferenceChange: (v: string) => void;
  onGenerate: () => void;
  summary: string;
  plan: TripItem[];
  onToggleItem: (index: number) => void;
  onImport: () => void;
  fmtDate: (s: string, allDay?: boolean) => string;
}

export function TripPlanner({
  destination,
  startDate,
  endDate,
  preference,
  onDestinationChange,
  onStartDateChange,
  onEndDateChange,
  onPreferenceChange,
  onGenerate,
  summary,
  plan,
  onToggleItem,
  onImport,
  fmtDate,
}: TripPlannerProps) {
  return (
    <article className="panel planner" id="planner">
      <span className="eyebrow">旅行助手</span>
      <h2>生成行程草案</h2>
      <label>
        目的地
        <input
          value={destination}
          onChange={(e) => onDestinationChange(e.target.value)}
          placeholder="例如：杭州"
        />
      </label>
      <div className="field-grid">
        <label>
          出发
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
          />
        </label>
        <label>
          返程
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
          />
        </label>
      </div>
      <label>
        偏好
        <input
          value={preference}
          onChange={(e) => onPreferenceChange(e.target.value)}
          placeholder="美食、慢节奏"
        />
      </label>
      <button className="primary full" onClick={onGenerate}>
        生成草案
      </button>
      {summary && <p className="summary">{summary}</p>}
      {plan.map((item, i) => (
        <label className="plan-row" key={item.id}>
          <input
            type="checkbox"
            checked={item.selected}
            onChange={() => onToggleItem(i)}
          />
          <span>
            <b>{item.title}</b>
            <small>
              {fmtDate(item.startsAt)}–
              {new Date(item.endsAt).toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </small>
          </span>
        </label>
      ))}
      {plan.length > 0 && (
        <button className="primary full" onClick={onImport}>
          导入已选安排
        </button>
      )}
    </article>
  );
}
