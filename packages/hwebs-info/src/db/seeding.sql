DROP TABLE IF EXISTS items;
CREATE TABLE IF NOT EXISTS items (title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL);
INSERT INTO items (title, description) VALUES ('Code', 'This is my code', 'home');
INSERT INTO items (title, description) VALUES ('Games', 'These are my games', 'home');
INSERT INTO items (title, description) VALUES ('Music', 'This is my music', 'home');
INSERT INTO items (title, description) VALUES ('Animation', 'This is my animation', 'home');
INSERT INTO items (title, description) VALUES ('About', 'This is me', 'home');
