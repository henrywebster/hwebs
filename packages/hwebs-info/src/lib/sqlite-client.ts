import Database from 'better-sqlite3';
import { sqliteClient } from '@hwebs/content-client';

const db = new Database(':memory:');
db.prepare('CREATE TABLE items (title TEXT NOT NULL)').run();

const insert = db.prepare('INSERT INTO items VALUES (?)');
insert.run('Post 1');
insert.run('Post 2');

export const client = sqliteClient(db);
