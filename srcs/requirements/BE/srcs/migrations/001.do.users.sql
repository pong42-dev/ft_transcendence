CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	email VARCHAR UNIQUE NOT NULL,
	password VARCHAR(20) ,
	provider VARCHAR(10) NOT NULL CHECK (provider IN ('local', 'google')),
	provider_id VARCHAR
);