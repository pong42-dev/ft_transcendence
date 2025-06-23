CREATE TABLE IF NOT EXISTS tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player1_id INTEGER NOT NULL,
    player2_id INTEGER NOT NULL,
    player3_id INTEGER NOT NULL,
    player4_id INTEGER NOT NULL,
    semi_final1_game_id INTEGER,
    semi_final2_game_id INTEGER,
    final_game_id INTEGER,
    status VARCHAR(10) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
    finished_at DATETIME,
    FOREIGN KEY(player1_id) REFERENCES users(id),
    FOREIGN KEY(player2_id) REFERENCES users(id),
    FOREIGN KEY(player3_id) REFERENCES users(id),
    FOREIGN KEY(player4_id) REFERENCES users(id),
    FOREIGN KEY(semi_final1_game_id) REFERENCES games(id),
    FOREIGN KEY(semi_final2_game_id) REFERENCES games(id),
    FOREIGN KEY(final_game_id) REFERENCES games(id)
); 