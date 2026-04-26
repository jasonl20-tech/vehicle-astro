-- D1: Schema wie `submissions`, nur getrennte Tabelle für Trial-Anfragen.
-- Ausführen: wrangler d1 execute <DB_NAME> --remote --file=…
CREATE TABLE IF NOT EXISTS trial_submissions (
    id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    form_tag TEXT NOT NULL,
    payload TEXT NOT NULL CHECK (json_valid(payload)),
    metadata TEXT NOT NULL CHECK (json_valid(metadata)),
    spam BOOLEAN DEFAULT 0
);
