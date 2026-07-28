// ── 离线操作队列（IndexedDB） ──
// 断网时暂存操作，恢复网络后自动同步

interface QueuedOp {
  id: string;
  method: string;
  url: string;
  body?: string;
  timestamp: string;
  retries: number;
}

const DB_NAME = "ai-secretary-offline";
const STORE_NAME = "queue";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** 加入离线队列 */
export async function enqueue(op: Omit<QueuedOp, "id" | "timestamp" | "retries">): Promise<void> {
  if (navigator.onLine) return; // Only queue when offline

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add({
      id: crypto.randomUUID(),
      ...op,
      timestamp: new Date().toISOString(),
      retries: 0,
    });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IndexedDB not available — nothing we can do
  }
}

/** 同步离线队列（在网络恢复时调用） */
export async function syncQueue(authToken: string): Promise<number> {
  if (!navigator.onLine) return 0;

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const items = await new Promise<QueuedOp[]>((resolve) => {
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result);
    });
    db.close();

    let synced = 0;
    for (const item of items) {
      try {
        await fetch(item.url, {
          method: item.method,
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`,
          },
          body: item.body,
        });
        // Remove from queue on success
        const db2 = await openDB();
        const tx2 = db2.transaction(STORE_NAME, "readwrite");
        tx2.objectStore(STORE_NAME).delete(item.id);
        await new Promise<void>((resolve) => { tx2.oncomplete = () => resolve(); });
        db2.close();
        synced++;
      } catch {
        // Leave in queue, will retry next time
      }
    }
    return synced;
  } catch {
    return 0;
  }
}

/** 设置网络恢复监听器 */
export function setupOfflineSync(getToken: () => string | null): () => void {
  const handler = () => {
    if (navigator.onLine) {
      const token = getToken();
      if (token) syncQueue(token);
    }
  };

  window.addEventListener("online", handler);
  return () => window.removeEventListener("online", handler);
}
