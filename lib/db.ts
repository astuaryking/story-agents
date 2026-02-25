import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'story-agents.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id          TEXT PRIMARY KEY,
      name        TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      api_key     TEXT UNIQUE NOT NULL,
      claim_token TEXT UNIQUE NOT NULL,
      claim_status TEXT NOT NULL DEFAULT 'pending_claim',
      owner_email TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      last_active TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stories (
      id                    TEXT PRIMARY KEY,
      theme                 TEXT NOT NULL,
      status                TEXT NOT NULL DEFAULT 'waiting',
      max_rounds            INTEGER NOT NULL DEFAULT 5,
      min_agents            INTEGER NOT NULL DEFAULT 2,
      current_round         INTEGER NOT NULL DEFAULT 1,
      current_turn_agent_id TEXT,
      created_at            TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (current_turn_agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS story_participants (
      id                TEXT PRIMARY KEY,
      story_id          TEXT NOT NULL,
      agent_id          TEXT NOT NULL,
      personality       TEXT NOT NULL,
      secret_objective  TEXT NOT NULL,
      turn_order        INTEGER NOT NULL,
      joined_at         TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (story_id) REFERENCES stories(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      UNIQUE (story_id, agent_id),
      UNIQUE (story_id, turn_order)
    );

    CREATE TABLE IF NOT EXISTS story_lines (
      id           TEXT PRIMARY KEY,
      story_id     TEXT NOT NULL,
      agent_id     TEXT NOT NULL,
      content      TEXT NOT NULL,
      round_number INTEGER NOT NULL,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (story_id) REFERENCES stories(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS reactions (
      id         TEXT PRIMARY KEY,
      story_id   TEXT NOT NULL,
      line_id    TEXT NOT NULL,
      agent_id   TEXT NOT NULL,
      content    TEXT NOT NULL,
      type       TEXT NOT NULL CHECK (type IN ('reaction', 'inner_monologue')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (story_id) REFERENCES stories(id),
      FOREIGN KEY (line_id) REFERENCES story_lines(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS plot_twists (
      id                   TEXT PRIMARY KEY,
      story_id             TEXT NOT NULL,
      proposed_by_agent_id TEXT NOT NULL,
      proposal             TEXT NOT NULL,
      status               TEXT NOT NULL DEFAULT 'voting',
      created_at           TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (story_id) REFERENCES stories(id),
      FOREIGN KEY (proposed_by_agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS plot_twist_votes (
      id           TEXT PRIMARY KEY,
      plot_twist_id TEXT NOT NULL,
      agent_id     TEXT NOT NULL,
      vote         TEXT NOT NULL CHECK (vote IN ('yes', 'no')),
      FOREIGN KEY (plot_twist_id) REFERENCES plot_twists(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      UNIQUE (plot_twist_id, agent_id)
    );

    CREATE TABLE IF NOT EXISTS judge_results (
      id                  TEXT PRIMARY KEY,
      story_id            TEXT UNIQUE NOT NULL,
      coherence_score     INTEGER NOT NULL,
      humor_score         INTEGER NOT NULL,
      creativity_score    INTEGER NOT NULL,
      delight_score       INTEGER NOT NULL,
      narrative_flow_score INTEGER NOT NULL,
      summary             TEXT NOT NULL,
      mvp_agent_id        TEXT NOT NULL,
      mvp_reason          TEXT NOT NULL,
      created_at          TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (story_id) REFERENCES stories(id),
      FOREIGN KEY (mvp_agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS objective_scores (
      id         TEXT PRIMARY KEY,
      story_id   TEXT NOT NULL,
      agent_id   TEXT NOT NULL,
      score      INTEGER NOT NULL,
      comment    TEXT NOT NULL,
      FOREIGN KEY (story_id) REFERENCES stories(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      UNIQUE (story_id, agent_id)
    );

    CREATE TABLE IF NOT EXISTS objective_votes (
      id            TEXT PRIMARY KEY,
      story_id      TEXT NOT NULL,
      voter_id      TEXT NOT NULL,
      voted_for_id  TEXT NOT NULL,
      reason        TEXT,
      FOREIGN KEY (story_id) REFERENCES stories(id),
      FOREIGN KEY (voter_id) REFERENCES agents(id),
      FOREIGN KEY (voted_for_id) REFERENCES agents(id),
      UNIQUE (story_id, voter_id)
    );
  `);
}
