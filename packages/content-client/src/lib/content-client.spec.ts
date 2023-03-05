import { mapClient, sqliteClient } from './content-client';

describe.each([
  { name: 'map', client: mapClient },
  { name: 'sqlite', client: sqliteClient },
])('Content Client $name', ({ client }) => {
  it('should return undefined when key is not preset', () => {
    expect(client().get('abc')).toEqual(undefined);
  });

  it('should create the data', () => {
    const content = client().create('My data');
    expect(content.title).toEqual('My data');
  });

  it('should get the data', () => {
    const testClient = client();
    const content = testClient.create('My data');
    expect(testClient.get(content.id).title).toEqual('My data');
  });
  it('should update the data', () => {
    const testClient = client();
    const id = testClient.create('My data').id;
    const content = testClient.update(id, 'My updated data');
    expect(content.title).toEqual('My updated data');
  });
  it('should delete the data', () => {
    const testClient = client();
    const id = testClient.create('My data').id;
    const content = testClient.remove(id);
    expect(content).toEqual(undefined);
    expect(testClient.get(id)).toEqual(undefined);
  });
  it('should get all data', () => {
    const testClient = client();
    testClient.create('My data A');
    testClient.create('My data B');
    const result = testClient.list();
    expect(result.length).toEqual(2);
  });
});
