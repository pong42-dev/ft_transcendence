CREATE TABLE IF NOT EXISTS tmp_tokens (
	token VARCHAR PRIMARY KEY,
	user_id INTEGER NOT NULL,
	type VARCHAR(20) NOT NULL CHECK (type IN ('2fa')),
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	expires_at DATETIME NOT NULL 
);

-- 인덱스 (만료된 토큰 정리용)
CREATE INDEX idx_tmp_tokens_expires_at ON tmp_tokens(expires_at);