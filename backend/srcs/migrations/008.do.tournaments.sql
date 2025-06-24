CREATE TABLE IF NOT EXISTS tournaments (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER,
	guest1_name VARCHAR,
	guest2_name VARCHAR,
	guest3_name VARCHAR,

	game1_id INTEGER REFERENCES games(id) ON DELETE SET NULL,
	game2_id INTEGER REFERENCES games(id) ON DELETE SET NULL,
	game3_id INTEGER REFERENCES games(id) ON DELETE SET NULL,

	status VARCHAR(10) NOT NULL CHECK (status IN ('waiting', 'playing', 'finished')),
	ended_at DATETIME
);
