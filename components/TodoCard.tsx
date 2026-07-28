"use client";
import type { TodoItem } from "@/lib/types";

interface TodoCardProps {
  todo: TodoItem;
  onToggle: () => void;
}

export function TodoCard({ todo, onToggle }: TodoCardProps) {
  const priorityLabel = todo.priority === 2 ? "紧急" : todo.priority === 1 ? "重要" : "";
  const priorityClass = todo.priority === 2 ? "high" : todo.priority === 1 ? "medium" : "";

  // Check if overdue
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  const isOverdue = todo.dueDate && todo.dueDate < today && !todo.completed;

  return (
    <div className="todo-card" style={isOverdue ? { borderColor: "var(--red)", background: "var(--red-soft)" } : undefined}>
      <button
        className={`checkbox ${todo.completed ? "done" : ""}`}
        onClick={onToggle}
        aria-label={todo.completed ? "取消完成" : "标记完成"}
      />
      <div className="todo-body">
        <div className={`todo-title ${todo.completed ? "done" : ""}`}>
          {isOverdue && <span style={{ color: "var(--red)", marginRight: 4 }}>⚠️</span>}
          {todo.title}
        </div>
        <div className="todo-meta">
          {todo.dueDate && (
            <span style={isOverdue ? { color: "var(--red)", fontWeight: 600 } : undefined}>
              📅 {new Date(todo.dueDate + "T00:00").toLocaleDateString("zh-CN", { month: "short", day: "numeric" })} {isOverdue ? "已过期" : ""}
            </span>
          )}
          {priorityLabel && <span className={`priority ${priorityClass}`}>{priorityLabel}</span>}
        </div>
      </div>
    </div>
  );
}
