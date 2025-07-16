CREATE TABLE IF NOT EXISTS user_tokens (
	user_id INTEGER NOT NULL,
	token_version VARCHAR NOT NULL,
	server_refresh_token VARCHAR NOT NULL,
	server_expires_at DATETIME,
	google_refresh_token VARCHAR,
	FOREIGN KEY (user_id) REFERENCES users(id)
);