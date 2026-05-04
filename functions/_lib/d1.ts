/** Gemeinsames D1-Binding: Production kann `webseite` oder (Legacy) `database` heißen. */
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export type D1PagesEnv = {
  webseite?: D1Database;
  database?: D1Database;
};

export function resolveD1Database(env: D1PagesEnv): D1Database | null {
  const db = env.webseite ?? env.database;
  return db ?? null;
}
