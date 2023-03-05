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
    expect(client.get('abc')).toEqual(undefined);
  });

  it('should create the data', () => {
    const content = client.create('My data');
    expect(content.title).toEqual('My data');
  });

  it('should get the data', () => {
    const content = client.create('My data');
    expect(client.get(content.id).title).toEqual('My data');
  });
  it('should update the data', () => {
    const id = client.create('My data').id;
    const content = client.update(id, 'My updated data');
    expect(content.title).toEqual('My updated data');
  });
  it('should delete the data', () => {
    const id = client.create('My data').id;
    const content = client.remove(id);
    expect(content).toEqual(undefined);
    expect(client.get(id)).toEqual(undefined);
  });
  it('should get all data', () => {
    client.create('My data A');
    client.create('My data B');
    const result = client.list();
    expect(result.length).toEqual(2);
  });
});
