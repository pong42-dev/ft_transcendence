CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type VARCHAR(10) NOT NULL CHECK (type IN ('user', 'guest', 'ai')),
    user_id INTEGER UNIQUE,
    display_name VARCHAR,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (
        (type = 'user' AND user_id IS NOT NULL AND display_name IS NULL) OR
        (type = 'guest' AND user_id IS NULL AND display_name IS NOT NULL) OR
        (type = 'ai' AND user_id IS NULL AND display_name IS NOT NULL)
    )
);