CREATE TABLE IF NOT EXISTS friends (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NOT NULL,
	friend_id INTEGER NOT NULL,
	status VARCHAR(10) NOT NULL CHECK (status IN ('following')),
	requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	UNIQUE(user_id, friend_id),
	CHECK (user_id != friend_id),
	FOREIGN KEY(user_id) REFERENCES users(id),
	FOREIGN KEY(friend_id) REFERENCES users(id)
);