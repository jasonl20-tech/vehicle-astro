-- D1: einmalig ausführen (z. B. wrangler d1 execute <DB_NAME> --remote --file=…)
CREATE TABLE IF NOT EXISTS newsletter (
    id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT NOT NULL CHECK (json_valid(metadata)),
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
