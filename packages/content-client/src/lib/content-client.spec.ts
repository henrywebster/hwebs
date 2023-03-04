import { mapClient, sqliteClient } from './content-client';

describe.each([
  { name: 'map', client: mapClient() },
  { name: 'sqlite', client: sqliteClient() },
])('Content Client $name', ({ client }) => {
  it('should return undefined when key is not preset', () => {
    expect(client.get('abc')).toEqual(undefined);
  });

  it('should create the data', () => {
    const content = client.create('My data');
    expect(content.title).toEqual('My data');
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
});
