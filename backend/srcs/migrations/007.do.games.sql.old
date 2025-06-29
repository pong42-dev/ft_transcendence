CREATE TABLE IF NOT EXISTS games (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	type VARCHAR(10) NOT NULL CHECK (type IN ('1vs1', 'tourn')),
	user_id INTEGER,
	guest_name VARCHAR,
	user2_id INTEGER,
	guest2_name VARCHAR,
	winner VARCHAR,
	status VARCHAR(10) NOT NULL CHECK (status IN ('waiting', 'playing', 'finished')),
	ended_at DATETIME
);