"use client";
import type { QuickAction } from "@/lib/types";

interface QuickActionsProps {
  actions: QuickAction[];
  onAction: (intent: string) => void;
}

export function QuickActions({ actions, onAction }: QuickActionsProps) {
  return (
    <div className="chips">
      {actions.map((action) => (
        <button
          key={action.intent}
          className="chip"
          onClick={() => onAction(action.intent)}
        >
          {action.icon && <span>{action.icon} </span>}
          {action.label}
        </button>
      ))}
    </div>
  );
}
