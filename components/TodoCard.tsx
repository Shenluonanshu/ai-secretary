"use client";
import type { TodoItem } from "@/lib/types";

interface TodoCardProps {
  todo: TodoItem;
  onToggle: () => void;
}

export function TodoCard({ todo, onToggle }: TodoCardProps) {
  const priorityLabel = todo.priority === 2 ? "紧急" : todo.priority === 1 ? "重要" : "";
  const priorityClass = todo.priority === 2 ? "high" : todo.priority === 1 ? "medium" : "";

  return (
    <div className="todo-card">
      <button
        className={`checkbox ${todo.completed ? "done" : ""}`}
        onClick={onToggle}
        aria-label={todo.completed ? "取消完成" : "标记完成"}
      />
      <div className="todo-body">
        <div className={`todo-title ${todo.completed ? "done" : ""}`}>
          {todo.title}
        </div>
        <div className="todo-meta">
          {todo.dueDate && <span>📅 {todo.dueDate} </span>}
          {priorityLabel && <span className={`priority ${priorityClass}`}>{priorityLabel}</span>}
        </div>
      </div>
    </div>
  );
}
