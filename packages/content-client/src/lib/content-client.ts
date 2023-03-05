import { v4 as uuidv4 } from 'uuid';
import Database = require('better-sqlite3');
import assert = require('assert');

const mapClient = (data: Map<string, string>) => {
  return {
    async get(id: string) {
      if (!data.has(id)) {
        return undefined;
      }
      return { id: id, title: data.get(id) };
    },
    async list() {
      return Array.from(data).map(([k, v]) => ({ id: k, title: v }));
    },
    async create(title: string) {
      const id = uuidv4();
      data.set(id, title);
      return { id: id, title: title };
    },
    async update(id: string, title: string) {
      if (!data.has(id)) {
        return undefined;
      }
      data.set(id, title);
      return { id: id, title: title };
    },
    async remove(id: string) {
      data.delete(id);
      return undefined;
    },
  };
};

const sqliteClient = (db: Database.Database) => {
  const get_query = 'SELECT rowid AS id, title FROM items WHERE rowid=?';
  return {
    async get(id: string) {
      return db.prepare(get_query).get(id);
    },
    async list() {
      return db.prepare('SELECT rowid AS id, title FROM items').all();
    },
    async create(title: string) {
      const info = db
        .prepare('INSERT INTO items (title) VALUES (?)')
        .run(title);
      assert(info.changes === 1);
      return db.prepare(get_query).get(info.lastInsertRowid);
    },
    async update(id: string, title: string) {
      // TODO make non-destructive
      const info = db
        .prepare('UPDATE items SET title=? WHERE rowid=?')
        .run(title, id);
      assert(info.changes === 1);
      return db.prepare(get_query).get(id);
    },
    async remove(id: string) {
      const info = db.prepare('DELETE FROM items WHERE rowid=?').run(id);
      assert(info.changes === 1);
      return undefined;
    },
  };
};
export { mapClient, sqliteClient };
