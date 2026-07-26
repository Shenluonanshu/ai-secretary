export type Source = "manual" | "text" | "voice" | "trip";
export type CalendarEvent = { id:string; title:string; description?:string; startsAt:string; endsAt:string; allDay:boolean; timezone:string; reminders:number[]; recurrence:"none"|"daily"|"weekly"|"monthly"; source:Source; createdAt:string };
export type EventDraft = Omit<CalendarEvent,"id"|"createdAt">;
export type TripItem = { id:string; title:string; startsAt:string; endsAt:string; selected:boolean };
