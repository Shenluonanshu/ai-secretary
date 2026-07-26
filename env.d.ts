// Cloudflare D1 database type
declare global {
  interface D1Result<T = unknown> {
    results: T[];
  }

  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    first<T = unknown>(colName?: string): Promise<T | null>;
    all<T = unknown>(): Promise<D1Result<T>>;
    run(): Promise<D1Result>;
  }

  interface D1Database {
    prepare(query: string): D1PreparedStatement;
  }

  interface CloudflareEnv {
    DB: D1Database;
  }
}

// Cloudflare next-on-pages getRequestContext
declare module "@cloudflare/next-on-pages" {
  function getRequestContext(): {
    env: CloudflareEnv;
  };
}

export {};
