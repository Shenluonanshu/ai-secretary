"use client";
import { useEffect, useRef } from "react";
import type { ChatMessage as ChatMessageType, HabitWithStreak } from "@/lib/types";
import { ChatMessage } from "./ChatMessage";
import { EventCard } from "./EventCard";
import { BriefingCard } from "./BriefingCard";
import { TodoCard } from "./TodoCard";
import { HabitRow } from "./HabitRow";
import { QuickActions } from "./QuickActions";

interface ChatMessageListProps {
  messages: ChatMessageType[];
  isProcessing: boolean;
  onConfirmEvent: (id: string) => void;
  onEditEvent: (id: string) => void;
  onDeleteEvent: (id: string) => void;
  onToggleTodo: (id: string) => void;
  onCheckHabit: (id: string) => void;
  onAction: (intent: string) => void;
  fmtDate: (s: string, allDay?: boolean) => string;
}

export function ChatMessageList({
  messages,
  isProcessing,
  onConfirmEvent,
  onEditEvent,
  onDeleteEvent,
  onToggleTodo,
  onCheckHabit,
  onAction,
  fmtDate,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  return (
    <div className="chat-messages" role="log" aria-label="对话消息">
      {messages.map((msg) => {
        // Date divider
        if (msg.type === "divider") {
          return (
            <div key={msg.id} className="date-divider">
              {msg.content}
            </div>
          );
        }

        // Rich cards that span the full width (not in a bubble)
        if (msg.type === "event_card" && msg.event) {
          return (
            <div key={msg.id} className="msg assistant" style={{ maxWidth: "92%" }}>
              <div className="avatar">🤖</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {msg.content && <div className="bubble" style={{ marginBottom: 4 }}>{msg.content}</div>}
                <EventCard
                  event={msg.event}
                  mode={msg.content.includes("已创建") || msg.content.includes("已保存") ? "preview" : "confirm"}
                  onConfirm={() => onConfirmEvent(msg.event!.id)}
                  onEdit={() => onEditEvent(msg.event!.id)}
                  onDelete={() => onDeleteEvent(msg.event!.id)}
                  fmtDate={fmtDate}
                />
              </div>
            </div>
          );
        }

        // Event list (multiple events)
        if (msg.type === "event_list" && msg.events) {
          return (
            <div key={msg.id} className="msg assistant" style={{ maxWidth: "92%" }}>
              <div className="avatar">🤖</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {msg.content && <div className="bubble" style={{ marginBottom: 4 }}>{msg.content}</div>}
                {msg.events.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    mode="preview"
                    onEdit={() => onEditEvent(ev.id)}
                    onDelete={() => onDeleteEvent(ev.id)}
                    fmtDate={fmtDate}
                  />
                ))}
              </div>
            </div>
          );
        }

        // Briefing card
        if (msg.type === "briefing" && msg.briefing) {
          return (
            <div key={msg.id} className="msg assistant" style={{ maxWidth: "95%" }}>
              <div className="avatar">🤖</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <BriefingCard briefing={msg.briefing} />
              </div>
            </div>
          );
        }

        // Todo card
        if (msg.type === "todo_card" && msg.todo) {
          return (
            <div key={msg.id} className="msg assistant" style={{ maxWidth: "92%" }}>
              <div className="avatar">🤖</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {msg.content && <div className="bubble" style={{ marginBottom: 4 }}>{msg.content}</div>}
                <TodoCard todo={msg.todo} onToggle={() => onToggleTodo(msg.todo!.id)} />
              </div>
            </div>
          );
        }

        // Habit card
        if (msg.type === "habit_card" && msg.habit) {
          return (
            <div key={msg.id} className="msg assistant" style={{ maxWidth: "92%" }}>
              <div className="avatar">🤖</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <HabitRow habit={msg.habit} onCheck={() => onCheckHabit(msg.habit!.id)} />
              </div>
            </div>
          );
        }

        // Quick actions
        if (msg.type === "quick_actions" && msg.actions) {
          return (
            <div key={msg.id} className="msg assistant" style={{ maxWidth: "92%" }}>
              <div className="avatar">🤖</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {msg.content && <div className="bubble" style={{ marginBottom: 6 }}>{msg.content}</div>}
                <QuickActions actions={msg.actions} onAction={onAction} />
              </div>
            </div>
          );
        }

        // Plain text message (user or assistant)
        return (
          <ChatMessage key={msg.id} message={msg} />
        );
      })}

      {isProcessing && (
        <div className="msg assistant">
          <div className="avatar">🤖</div>
          <div className="typing-dots">
            <span /><span /><span />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
