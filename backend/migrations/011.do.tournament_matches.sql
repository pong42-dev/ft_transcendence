CREATE TABLE IF NOT EXISTS tournament_matches (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	game_session_id INTEGER,
	type VARCHAR(15) NOT NULL CHECK (type IN ('local_1v1', 'ai_1v1', 'tournament')),
	tournament_id INTEGER,
	round_number INTEGER NOT NULL DEFAULT 1,
	winner_id INTEGER,				
	status VARCHAR(10) NOT NULL CHECK (status IN ('waiting', 'countdown', 'playing', 'finished', 'canceled')),
	started_at DATETIME,
	ended_at DATETIME,
	participant_1_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
	participant_2_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
	FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE SET NULL,
	FOREIGN KEY (winner_id) REFERENCES players(id) ON DELETE SET NULL
);
