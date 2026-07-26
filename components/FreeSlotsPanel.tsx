"use client";
import type { EventDraft } from "@/lib/types";

interface FreeSlotsPanelProps {
  selectedDate: string;
  onDateChange: (d: string) => void;
  freeSlots: string[];
  onSlotClick: (startsAt: string, endsAt: string) => void;
}

export function FreeSlotsPanel({
  selectedDate,
  onDateChange,
  freeSlots,
  onSlotClick,
}: FreeSlotsPanelProps) {
  return (
    <article className="panel focus" id="insights">
      <span className="eyebrow">空闲时间</span>
      <h2>为专注留出空间</h2>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => onDateChange(e.target.value)}
      />
      <div className="slot-list">
        {freeSlots.length ? (
          freeSlots.map((slot) => {
            const [start, end] = slot.split("–");
            return (
              <button
                key={slot}
                className="slot"
                onClick={() => onSlotClick(`${selectedDate}T${start}`, `${selectedDate}T${end}`)}
              >
                {slot}
                <small>可安排</small>
              </button>
            );
          })
        ) : (
          <div className="empty">工作时段已经排满。</div>
        )}
      </div>
    </article>
  );
}
