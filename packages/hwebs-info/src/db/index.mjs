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
const data = [
  { title: 'Code', description: 'This is my code', category: 'home' },
  { title: 'Games', description: 'These are my games', category: 'home' },
  { title: 'Music', description: 'This is my music', category: 'home' },
  { title: 'Animation', description: 'This is my animation', category: 'home' },
  { title: 'About', description: 'This is me', category: 'home' },
];

if (process.env.HWEBS_INFO_CLIENT === 'sqlite') {
  const db = new Database('packages/hwebs-info/src/db/test.db');
  db.prepare('DROP TABLE IF EXISTS items').run();
  db.prepare(
    'CREATE TABLE items (title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL)'
  ).run();

  const insertData = db.prepare(
    'INSERT INTO items (title, description, category) VALUES (@title, @description, @category)'
  );
  data.map((item) => insertData.run(item));
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
        data.map((item) =>
          client.send(
            new PutCommand({
              TableName: 'Items',
              Item: { id: uuidv4(), ...item },
            })
          )
        )
      )
    );
}
