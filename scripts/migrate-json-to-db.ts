import { PrismaClient } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";

async function migrate() {
  const prisma = new PrismaClient();
  const file = path.join(process.cwd(), "data", "events.json");

  try {
    const raw = await fs.readFile(file, "utf8");
    const events = JSON.parse(raw);

    if (!Array.isArray(events) || events.length === 0) {
      console.log("No events found in data/events.json. Nothing to migrate.");
      await prisma.$disconnect();
      return;
    }

    let count = 0;
    for (const e of events) {
      await prisma.event.create({
        data: {
          id: e.id,
          title: e.title,
          description: e.description ?? null,
          startsAt: new Date(e.startsAt),
          endsAt: new Date(e.endsAt),
          allDay: e.allDay ?? false,
          timezone: e.timezone ?? "Asia/Shanghai",
          reminders: JSON.stringify(e.reminders ?? [30]),
          recurrence: e.recurrence ?? "none",
          source: e.source ?? "manual",
          createdAt: e.createdAt ? new Date(e.createdAt) : new Date(),
        },
      });
      count++;
    }

    console.log(`Migrated ${count} events from data/events.json to SQLite.`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      console.log("data/events.json not found. Nothing to migrate.");
    } else {
      console.error("Migration error:", msg);
    }
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
