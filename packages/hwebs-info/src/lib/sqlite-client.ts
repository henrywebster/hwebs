import Database from 'better-sqlite3';
import { sqliteClient } from '@hwebs/content-client';

const db = new Database('packages/hwebs-info/src/db/test.db');

export const client = sqliteClient(db);
