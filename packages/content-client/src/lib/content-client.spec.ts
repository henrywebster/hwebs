/*eslint @typescript-eslint/no-unused-vars: ["error", { "ignoreRestSiblings": true }]*/

import { sqliteClient, dynamodbClient } from './content-client';
import Database = require('better-sqlite3');
import {
  DynamoDBClient,
  CreateTableCommand,
  DeleteTableCommand,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const globalSqlite = new Database(':memory:');
const globalDynamodb = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
});

beforeEach(async () => {
  globalSqlite
    .prepare(
      'CREATE TABLE items (title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL)'
    )
    .run();
  const params = {
    AttributeDefinitions: [
      {
        AttributeName: 'id',
        AttributeType: 'S',
      },
    ],
    KeySchema: [
      {
        AttributeName: 'id',
        KeyType: 'HASH',
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1,
    },
    TableName: 'Items',
  };

  await globalDynamodb.send(new CreateTableCommand(params));
});

afterEach(async () => {
  globalSqlite.prepare('DROP TABLE items').run();
  await globalDynamodb.send(new DeleteTableCommand({ TableName: 'Items' }));
});

describe.each([
  { name: 'sqlite', client: sqliteClient(globalSqlite) },
  {
    name: 'dynamodb',
    client: dynamodbClient(DynamoDBDocumentClient.from(globalDynamodb)),
  },
])('Content Client: $name', ({ client }) => {
  it('should return undefined when key is not preset', () =>
    client.get('abc').then((content) => expect(content).toEqual(undefined)));

  it('should create the data', () =>
    client
      .create('My data', 'this is my data', 'data')
      .then(({ id, ...content }) =>
        expect(content).toEqual({
          title: 'My data',
          description: 'this is my data',
          category: 'data',
        })
      ));

  it('should get the data', () =>
    client.create('My data', 'this is my data', 'data').then((content) =>
      client.get(content.id).then(({ id, ...content }) =>
        expect(content).toEqual({
          title: 'My data',
          description: 'this is my data',
          category: 'data',
        })
      )
    ));
  it('should update the data', () =>
    client.create('My data', 'this is my data', 'data').then((content) =>
      client
        .update(content.id, 'My updated data', 'this is my new data', 'sports')
        .then(({ id, ...content }) =>
          expect(content).toEqual({
            title: 'My updated data',
            description: 'this is my new data',
            category: 'sports',
          })
        )
    ));
  it('should delete the data', () =>
    client
      .create('My data', 'this is my data', 'data')
      .then((content) =>
        client
          .remove(content.id)
          .then((id) =>
            client.get(id).then((content) => expect(content).toEqual(undefined))
          )
      ));
  it('should get all data', () =>
    Promise.all([
      client.create('My data A', 'this is data A', 'data'),
      client.create('My data B', 'this is data B', 'data'),
    ]).then(() =>
      client.list().then((contents) => expect(contents.length).toEqual(2))
    ));
});
