CREATE TABLE IF NOT EXISTS games (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	type VARCHAR(15) NOT NULL CHECK (type IN ('local_1v1', 'ai_1v1', 'tournament')),
	tournament_id INTEGER, FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE SET NULL,
	round_number INTEGER NOT NULL DEFAULT 1,
	winner_id INTEGER, FOREIGN KEY (winner_id) REFERENCES players(id) ON DELETE SET NULL,				
	status VARCHAR(10) NOT NULL CHECK (status IN ('waiting', 'playing', 'finished', 'canceled')),
	started_at DATETIME,
	ended_at DATETIME
);
