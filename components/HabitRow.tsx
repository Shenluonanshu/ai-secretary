"use client";
import type { HabitWithStreak } from "@/lib/types";

interface HabitRowProps {
  habit: HabitWithStreak;
  onCheck: () => void;
}

export function HabitRow({ habit, onCheck }: HabitRowProps) {
  return (
    <div className="habit-row">
      <span className="hab-icon">{habit.icon}</span>
      <div className="hab-info">
        <div className="hab-name">{habit.name}</div>
        <div className="hab-progress">
          本周 {habit.weekProgress}
        </div>
      </div>
      {habit.streak > 0 && <span className="hab-streak">🔥{habit.streak}天</span>}
      <button
        className={`check-btn ${habit.todayDone ? "done" : ""}`}
        onClick={onCheck}
      >
        {habit.todayDone ? "✓ 已完成" : "打卡"}
      </button>
    </div>
  );
}
