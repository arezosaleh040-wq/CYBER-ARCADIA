CREATE DATABASE IF NOT EXISTS cyber_arcadia CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cyber_arcadia;
CREATE TABLE IF NOT EXISTS users (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 username VARCHAR(24) NOT NULL UNIQUE,
 email VARCHAR(254) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 role ENUM('player','admin') NOT NULL DEFAULT 'player',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS games (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 game_key VARCHAR(40) NOT NULL UNIQUE,
 title VARCHAR(100) NOT NULL,
 enabled TINYINT(1) NOT NULL DEFAULT 1,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS scores (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL,
 game_key VARCHAR(40) NOT NULL,
 score INT UNSIGNED NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_scores_game_score(game_key,score),
 INDEX idx_scores_user_created(user_id,created_at),
 CONSTRAINT fk_scores_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 CONSTRAINT fk_scores_game FOREIGN KEY(game_key) REFERENCES games(game_key) ON UPDATE CASCADE
) ENGINE=InnoDB;
INSERT IGNORE INTO games(game_key,title) VALUES
('neon-runner','Neon Runner'),('cyber-puzzle','Cyber Puzzle'),('space-shooter','Space Shooter'),
('memory-grid','Memory Grid'),('snake','Snake'),('brick-breaker','Brick Breaker'),
('tic-tac-toe','Tic Tac Toe'),('reaction-test','Reaction Test');
-- Register your account, then grant admin in SQL console:
-- UPDATE users SET role='admin' WHERE username='YOUR_USERNAME';
