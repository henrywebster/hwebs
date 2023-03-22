import BetterSqlite3 from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import {
  DynamoDBClient,
  CreateTableCommand,
  DeleteTableCommand,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import dynamodbConfig from '../../dynamodb-table-definition.json' assert { type: 'json' };

// TODO Define creation with client
// TODO Create different project for dynamodb so it can be shared
const categories = [
  { id: uuidv4(), title: 'Code' },
  { id: uuidv4(), title: 'Games' },
  { id: uuidv4(), title: 'Music' },
  { id: uuidv4(), title: 'Animation' },
  { id: uuidv4(), title: 'About' },
];

const posts = [
  {
    title: 'death ray of peace - Urbane Living',
    link: 'https://deathrayop.bandcamp.com/album/urbane-living',
    category: categories[2].id,
    datetime: 1534996800000,
  },
  {
    title: 'death ray of peace - music for strangers',
    link: 'https://deathrayop.bandcamp.com/album/music-for-strangers',
    category: categories[2].id,
    datetime: 1450846800000,
  },
];

if (process.env.HWEBS_INFO_CLIENT === 'sqlite') {
  const db = new BetterSqlite3('packages/hwebs-info/src/db/test.db');
  db.prepare('DROP TABLE IF EXISTS items').run();
  db.prepare('DROP TABLE IF EXISTS categories').run();
  db.prepare(
    'CREATE TABLE categories (id TEXT PRIMARY KEY, title TEXT NOT NULL)'
  ).run();
  db.prepare(
    'CREATE TABLE items (title TEXT NOT NULL, link TEXT NOT NULL, category TEXT NOT NULL, datetime INTEGER NOT NULL, FOREIGN KEY(category) REFERENCES categories(id))'
  ).run();

  const insertCategory = db.prepare(
    'INSERT INTO categories (id, title) VALUES (@id, @title)'
  );
  const insertPost = db.prepare(
    'INSERT INTO items (title, link, category, datetime) VALUES (@title, @link, @category, @datetime)'
  );
  categories.map((category) => insertCategory.run(category));
  posts.map((post) => insertPost.run(post));
} else if (process.env.HWEBS_INFO_CLIENT === 'dynamodb') {
  // TODO add .env
  const dynamodb = new DynamoDBClient({
    region: 'us-east-1',
    endpoint: `http://localhost:${
      process.env.HWEBS_INFO_DYNAMODB_PORT || 8000
    }`,
  });

  const client = DynamoDBDocumentClient.from(dynamodb);

  await dynamodb
    .send(new DeleteTableCommand({ TableName: dynamodbConfig.TableName }))
    .catch((error) => {
      return;
    })
    .then((response) => dynamodb.send(new CreateTableCommand(dynamodbConfig)))
    .then((response) =>
      Promise.all(
        categories.map((category) =>
          client.send(
            new PutCommand({
              TableName: 'Items',
              Item: { type: 'category', ...category },
            })
          )
        )
      )
    )
    .then((response) =>
      Promise.all(
        posts.map((post) =>
          client.send(
            new PutCommand({
              TableName: 'Items',
              Item: { type: 'post', id: uuidv4(), ...post },
            })
          )
        )
      )
    );
}
