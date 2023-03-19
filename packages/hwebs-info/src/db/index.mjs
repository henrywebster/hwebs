import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import {
  DynamoDBClient,
  CreateTableCommand,
  DeleteTableCommand,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

// TODO Define creation with client
// TODO Create different project for dynamodb so it can be shared
const categories = [
  { title: 'Code' },
  { title: 'Games' },
  { title: 'Music' },
  { title: 'Animation' },
  { title: 'About' },
];

if (process.env.HWEBS_INFO_CLIENT === 'sqlite') {
  const db = new Database('packages/hwebs-info/src/db/test.db');
  db.prepare('DROP TABLE IF EXISTS items').run();
  db.prepare('DROP TABLE IF EXISTS categories').run();
  db.prepare(
    'CREATE TABLE categories (id TEXT PRIMARY KEY, title TEXT NOT NULL)'
  ).run();
  db.prepare(
    'CREATE TABLE items (title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, FOREIGN KEY(category) REFERENCES categories(id))'
  ).run();

  const insertCategory = db.prepare(
    'INSERT INTO categories (title) VALUES (@title)'
  );
  categories.map((item) => insertCategory.run(item));
} else if (process.env.HWEBS_INFO_CLIENT === 'dynamodb') {
  // TODO add .env
  const dynamodb = new DynamoDBClient({
    region: 'us-east-1',
    endpoint: 'http://localhost:8000',
  });

  const params = {
    AttributeDefinitions: [
      {
        AttributeName: 'id',
        AttributeType: 'S',
      },
      {
        AttributeName: 'type',
        AttributeType: 'S',
      },
      {
        AttributeName: 'category',
        AttributeType: 'S',
      },
    ],
    KeySchema: [
      {
        AttributeName: 'id',
        KeyType: 'HASH',
      },
      {
        AttributeName: 'type',
        KeyType: 'RANGE',
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1,
    },
    TableName: 'Items',
    GlobalSecondaryIndexes: [
      {
        // TODO parameterize name
        IndexName: 'post-index',
        KeySchema: [
          {
            AttributeName: 'category',
            KeyType: 'HASH',
          },
          {
            AttributeName: 'id',
            KeyType: 'RANGE',
          },
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 1,
          WriteCapacityUnits: 1,
        },
      },
    ],
  };

  const client = DynamoDBDocumentClient.from(dynamodb);

  // TODO check if exists first?
  // add await bs

  await dynamodb
    .send(new DeleteTableCommand({ TableName: 'Items' }))
    .catch((error) => {
      return;
    })
    .then((response) => dynamodb.send(new CreateTableCommand(params)))
    .then((response) =>
      Promise.all(
        categories.map((item) =>
          client.send(
            new PutCommand({
              TableName: 'Items',
              Item: { id: uuidv4(), type: 'category', ...item },
            })
          )
        )
      )
    );
}
