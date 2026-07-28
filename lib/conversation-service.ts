// ── 对话历史 API：Prisma 版 ──
import { prisma } from "./db";
import type { ChatMessage } from "./types";

// Prisma doesn't have Conversation model in schema; use raw SQL
export async function saveConversation(id: string, title: string, messages: ChatMessage[]): Promise<void> {
  const now = new Date();
  await prisma.$executeRawUnsafe(
    `INSERT OR REPLACE INTO Conversation (id, title, messages, createdAt, updatedAt) VALUES (?, ?, ?, COALESCE((SELECT createdAt FROM Conversation WHERE id=?), ?), ?)`,
    id, title, JSON.stringify(messages), id, now.toISOString(), now.toISOString()
  );
}

export async function loadConversation(id: string): Promise<{ title: string; messages: ChatMessage[] } | null> {
  const rows = await prisma.$queryRawUnsafe<{title:string;messages:string}[]>(
    "SELECT title, messages FROM Conversation WHERE id=?", id
  );
  if (!rows?.length) return null;
  return { title: rows[0].title, messages: JSON.parse(rows[0].messages) };
}

export async function listConversations(): Promise<{ id: string; title: string; updatedAt: string }[]> {
  const rows = await prisma.$queryRawUnsafe<{id:string;title:string;updatedAt:string}[]>(
    "SELECT id, title, updatedAt FROM Conversation ORDER BY updatedAt DESC LIMIT 20"
  );
  return rows || [];
}

export async function deleteConversation(id: string): Promise<void> {
  await prisma.$executeRawUnsafe("DELETE FROM Conversation WHERE id=?", id);
}
