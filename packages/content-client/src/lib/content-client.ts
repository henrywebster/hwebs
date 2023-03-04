import { v4 as uuidv4 } from 'uuid';
import Database = require('better-sqlite3');
import assert = require('assert');

const mapClient = () => {
  const data = new Map<string, string>();
  return {
    get(id: string) {
      return data.get(id);
    },
    create(title: string) {
      const id = uuidv4();
      data.set(id, title);
      return { id: id, title: title };
    },
    update(id: string, title: string) {
      if (!data.has(id)) {
        return undefined;
      }
      data.set(id, title);
      return { id: id, title: title };
    },
    remove(id: string) {
      data.delete(id);
      return undefined;
    },
  };
};

const sqliteClient = () => {
  const db = new Database(':memory:');
  db.prepare('CREATE TABLE items (title TEXT NOT NULL)').run();
  const get_query = db.prepare(
    'SELECT rowid AS id, title FROM items WHERE rowid=?'
  );
  return {
    get(id: string) {
      return get_query.get(id);
    },
    create(title: string) {
      const info = db
        .prepare('INSERT INTO items (title) VALUES (?)')
        .run(title);
      assert(info.changes === 1);
      return get_query.get(info.lastInsertRowid);
    },
    update(id: string, title: string) {
      // TODO make non-destructive
      const info = db
        .prepare('UPDATE items SET title=? WHERE rowid=?')
        .run(title, id);
      assert(info.changes === 1);
      return get_query.get(id);
    },
    remove(id: string) {
      const info = db.prepare('DELETE FROM items WHERE rowid=?').run(id);
      assert(info.changes === 1);
      return undefined;
    },
  };
};
export { mapClient, sqliteClient };
