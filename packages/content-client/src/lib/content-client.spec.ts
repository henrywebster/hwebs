import { mapClient, sqliteClient } from './content-client';
import Database = require('better-sqlite3');

const globalMap = new Map<string, string>();
const globalSqlite = new Database(':memory:');

beforeEach(() => {
  globalSqlite.prepare('CREATE TABLE items (title TEXT NOT NULL)').run();
});

afterEach(() => {
  globalMap.clear();
  globalSqlite.prepare('DROP TABLE items').run();
});

describe.each([
  { name: 'map', client: mapClient(globalMap) },
  { name: 'sqlite', client: sqliteClient(globalSqlite) },
])('Content Client $name', ({ client }) => {
  it('should return undefined when key is not preset', () => {
    return client.get('abc').then((content) => {
      expect(content).toEqual(undefined);
    });
  });

  it('should create the data', () => {
    return client.create('My data').then((content) => {
      expect(content.title).toEqual('My data');
    });
  });

  it('should get the data', () => {
    return client.create('My data').then((content) => {
      return client.get(content.id).then((content) => {
        expect(content.title).toEqual('My data');
      });
    });
  });
  it('should update the data', () => {
    return client.create('My data').then((content) => {
      return client.update(content.id, 'My updated data').then((content) => {
        expect(content.title).toEqual('My updated data');
      });
    });
  });
  it('should delete the data', () => {
    return client.create('My data').then((content) => {
      return client.remove(content.id).then((content) => {
        expect(content).toEqual(undefined);
      });
    });
  });
  it('should get all data', () => {
    return Promise.all([
      client.create('My data A'),
      client.create('My data B'),
    ]).then(() => {
      return client.list().then((contents) => {
        expect(contents.length).toEqual(2);
      });
    });
  });
});
