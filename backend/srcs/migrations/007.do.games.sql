CREATE TABLE IF NOT EXISTS games (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	game_type VARCHAR(10) NOT NULL CHECK (game_type IN ('1vs1', 'tournament')),
	player1_id INTEGER NOT NULL,
	player2_id INTEGER NOT NULL,
	winner_id INTEGER,
	status VARCHAR(10) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
	finished_at DATETIME,
	FOREIGN KEY(player1_id) REFERENCES users(id),
	FOREIGN KEY(player2_id) REFERENCES users(id),
	FOREIGN KEY(winner_id) REFERENCES users(id)
); 