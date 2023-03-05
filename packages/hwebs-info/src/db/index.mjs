import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import {
  DynamoDBClient,
  CreateTableCommand,
  DeleteTableCommand,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

if (process.env.HWEBS_INFO_CLIENT === 'sqlite') {
  const seeding = fs.readFileSync('packages/hwebs-info/src/db/seeding.sql', {
    encoding: 'utf-8',
  });

  const db = new Database('packages/hwebs-info/src/db/test.db');
  db.exec(seeding);
} else if (process.env.HWEBS_INFO_CLIENT === 'dynamodb') {
  // TODO add .env
  const dynamodb = new DynamoDBClient({
    region: 'us-east-1',
    endpoint: 'http://localhost:8000',
  });

  const params = {
    AttributeDefinitions: [
      {
        AttributeName: 'Id',
        AttributeType: 'S',
      },
    ],
    KeySchema: [
      {
        AttributeName: 'Id',
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
    .then((response) => dynamodb.send(new CreateTableCommand(params)))
    .then((response) =>
      Promise.all([
        client.send(
          new PutCommand({
            TableName: 'Items',
            Item: {
              Id: uuidv4(),
              Title: 'Post 1',
            },
          })
        ),
        client.send(
          new PutCommand({
            TableName: 'Items',
            Item: {
              Id: uuidv4(),
              Title: 'Post 2',
            },
          })
        ),
      ])
    );
}
