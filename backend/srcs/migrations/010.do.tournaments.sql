CREATE TABLE IF NOT EXISTS tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status VARCHAR(20) NOT NULL CHECK(status IN ('waiting', 'in-progress', 'ended', 'canceled')) DEFAULT 'waiting',
    winner_player_id INTEGER, -- 최종 우승자
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    FOREIGN KEY (winner_player_id) REFERENCES users(id)
);