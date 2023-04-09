/*eslint @typescript-eslint/no-unused-vars: ["error", { "ignoreRestSiblings": true }]*/

import { v4 as uuidv4 } from 'uuid';
import {
  sqliteCategoryClient,
  dynamodbCategoryClient,
  sqlitePostClient,
  dynamodbPostClient,
} from './content-client';
import Database = require('better-sqlite3');
import {
  DynamoDBClient,
  CreateTableCommand,
  DeleteTableCommand,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import dynamodbConfig = require('../../dynamodb-table-definition.json');

const globalSqlite = new Database(':memory:');
const globalDynamodb = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: `http://localhost:${
    process.env.HWEBS_CLIENT_DYNAMODB_PORT || 8000
  }`,
});

let defaultCategoryId = '';
let secondaryCategoryId = '';
const time = Date.now();
const defaultTableName = 'Items';
const defaultIndexName = 'post-index';

beforeEach(async () => {
  globalSqlite
    .prepare(
      'CREATE TABLE categories (id TEXT PRIMARY KEY, title TEXT NOT NULL)'
    )
    .run();
  globalSqlite
    .prepare(
      'CREATE TABLE items (title TEXT NOT NULL, link TEXT NOT NULL, category TEXT NOT NULL, datetime INTEGER NOT NULL, FOREIGN KEY(category) REFERENCES categories(id))'
    )
    .run();
  defaultCategoryId = uuidv4();
  secondaryCategoryId = uuidv4();
  globalSqlite
    .prepare('INSERT INTO categories (id, title) VALUES (?, ?)')
    .run(defaultCategoryId, 'default');
  globalSqlite
    .prepare('INSERT INTO categories (id, title) VALUES (?, ?)')
    .run(secondaryCategoryId, 'other');

  const putParams = {
    TableName: 'Items',
    Item: {
      id: defaultCategoryId,
      title: 'default',
      type: 'category',
    },
  };
  const otherParams = {
    TableName: 'Items',
    Item: {
      id: secondaryCategoryId,
      title: 'other',
      type: 'category',
    },
  };
  // TODO make one promise
  await globalDynamodb.send(new CreateTableCommand(dynamodbConfig));
  await DynamoDBDocumentClient.from(globalDynamodb).send(
    new PutCommand(putParams)
  );
  await DynamoDBDocumentClient.from(globalDynamodb).send(
    new PutCommand(otherParams)
  );
});

afterEach(async () => {
  globalSqlite.prepare('DROP TABLE items').run();
  globalSqlite.prepare('DROP TABLE categories').run();
  defaultCategoryId = '';
  secondaryCategoryId = '';
  await globalDynamodb.send(
    new DeleteTableCommand({ TableName: dynamodbConfig.TableName })
  );
});

describe.each([
  { name: 'sqlite', client: sqlitePostClient(globalSqlite) },
  {
    name: 'dynamodb',
    client: dynamodbPostClient(
      DynamoDBDocumentClient.from(globalDynamodb),
      defaultTableName,
      defaultIndexName
    ),
  },
])('Content Client: $name', ({ client }) => {
  it('should return undefined when key is not preset', () =>
    client.get('abc').then((content) => expect(content).toEqual(undefined)));

  it('should create the post', () =>
    client
      .create('My post', 'this is my post', defaultCategoryId, time)
      .then(({ id, ...post }) =>
        expect(post).toEqual({
          title: 'My post',
          link: 'this is my post',
          category: defaultCategoryId,
          datetime: time,
        })
      ));

  it('should not create the post when category is absent', async () =>
    await expect(() =>
      client.create('My post', 'this is my post', '-1')
    ).rejects.toThrow(Error));

  it('should get the post', () =>
    client
      .create('My post', 'this is my post', defaultCategoryId, time)
      .then((post) =>
        client.get(post.id).then(({ id, ...post }) =>
          expect(post).toEqual({
            title: 'My post',
            link: 'this is my post',
            category: defaultCategoryId,
            datetime: time,
          })
        )
      ));
  it('should update the data', () =>
    client
      .create('My post', 'this is my post', defaultCategoryId, time)
      .then((post) =>
        client
          .update(
            post.id,
            'My updated post',
            'this is my new post',
            defaultCategoryId,
            time
          )
          .then(({ id, ...post }) =>
            expect(post).toEqual({
              title: 'My updated post',
              link: 'this is my new post',
              category: defaultCategoryId,
              datetime: time,
            })
          )
      ));
  it('should delete the post', () =>
    client
      .create('My post', 'this is my post', defaultCategoryId, time)
      .then((post) =>
        client
          .remove(post.id)
          .then((id) =>
            client.get(id).then((post) => expect(post).toEqual(undefined))
          )
      ));
  it('should get all posts', () =>
    Promise.all([
      client.create('My post A', 'this is post A', defaultCategoryId, time),
      client.create('My post B', 'this is post B', defaultCategoryId, time),
    ]).then(() =>
      client.list().then((posts) => expect(posts.length).toEqual(2))
    ));
  it('should get only posts belonging to category', () =>
    Promise.all([
      client.create('My post A', 'this is post A', defaultCategoryId, time),
      client.create('My post B', 'this is post B', secondaryCategoryId, time),
    ]).then(() =>
      client
        .list(secondaryCategoryId)
        .then((posts) => expect(posts.length).toEqual(1))
    ));
});

describe.each([
  { name: 'sqlite', client: sqliteCategoryClient(globalSqlite) },
  {
    name: 'dynamodb',
    client: dynamodbCategoryClient(
      DynamoDBDocumentClient.from(globalDynamodb),
      defaultTableName
    ),
  },
])('Category Client: $name', ({ client }) => {
  it('should return undefined when key is not preset', () =>
    client.get('abc').then((category) => expect(category).toEqual(undefined)));
  it('should create the category', () =>
    client.create('My category').then(({ id, ...category }) =>
      expect(category).toEqual({
        title: 'My category',
      })
    ));
  it('should update the category', () =>
    client.create('My category').then((category) =>
      client
        .update(category.id, 'My updated category')
        .then(({ id, ...category }) =>
          expect(category).toEqual({
            title: 'My updated category',
          })
        )
    ));
  it('should delete the category', () =>
    client
      .create('My category')
      .then((category) =>
        client
          .remove(category.id)
          .then((id) =>
            client
              .get(id)
              .then((category) => expect(category).toEqual(undefined))
          )
      ));
  it('should get all categories', () =>
    Promise.all([
      client.create('My category A'),
      client.create('My category B'),
    ]).then(() =>
      client.list().then((categories) => expect(categories.length).toEqual(4))
    ));
});
