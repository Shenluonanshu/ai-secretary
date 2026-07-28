// ── 对话历史 API：D1 版 ──
import { getDB } from "./d1-client";
import type { ChatMessage } from "./types";

export async function saveConversation(id: string, title: string, messages: ChatMessage[]): Promise<void> {
  const db = getDB();
  const now = new Date().toISOString();
  await db.prepare(
    "INSERT OR REPLACE INTO Conversation (id, title, messages, createdAt, updatedAt) VALUES (?1, ?2, ?3, COALESCE((SELECT createdAt FROM Conversation WHERE id=?1), ?4), ?4)"
  ).bind(id, title, JSON.stringify(messages), now).run();
}

export async function loadConversation(id: string): Promise<{ title: string; messages: ChatMessage[] } | null> {
  const db = getDB();
  const row = await db.prepare("SELECT title, messages FROM Conversation WHERE id=?1").bind(id).first<{title:string;messages:string}>();
  if (!row) return null;
  return { title: row.title, messages: JSON.parse(row.messages) };
}

export async function listConversations(): Promise<{ id: string; title: string; updatedAt: string }[]> {
  const db = getDB();
  const { results } = await db.prepare("SELECT id, title, updatedAt FROM Conversation ORDER BY updatedAt DESC LIMIT 20").all<{id:string;title:string;updatedAt:string}>();
  return results || [];
}

export async function deleteConversation(id: string): Promise<void> {
  const db = getDB();
  await db.prepare("DELETE FROM Conversation WHERE id=?1").bind(id).run();
}
