/*eslint @typescript-eslint/no-unused-vars: ["error", { "ignoreRestSiblings": true }]*/
import { v4 as uuidv4 } from 'uuid';
import * as Database from 'better-sqlite3';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

interface Content {
  readonly id: string;
  readonly title: string;
  readonly link: string;
  readonly category: string;
  readonly datetime: number;
}

interface Category {
  readonly id: string;
  readonly title: string;
}

interface CategoryClient {
  get(id: string): Promise<Category | undefined>;
  list(): Promise<Category[]>;
  create(title: string): Promise<Category | undefined>;
  update(id: string, title: string): Promise<Category | undefined>;
  remove(id: string): Promise<string>;
}

interface PostClient {
  get(id: string): Promise<Content | undefined>;
  list(category?: string): Promise<Content[]>;
  create(
    title: string,
    link: string,
    category: string,
    datetime: number
  ): Promise<Content>;
  update(
    id: string,
    title: string,
    link: string,
    category: string,
    datetime: number
  ): Promise<Content | undefined>;
  remove(id: string): Promise<string>;
}

interface Client {
  posts: PostClient;
  categories: CategoryClient;
}

const sqliteCategoryClient = (db: Database.Database): CategoryClient => {
  const get_query = 'SELECT id, title FROM categories WHERE id=?';
  return {
    async get(id) {
      return db.prepare(get_query).get(id);
    },
    async list() {
      return db.prepare('SELECT id, title FROM categories').all();
    },
    async create(title) {
      const id = uuidv4();
      db.prepare('INSERT INTO categories (id, title) VALUES (?, ?)').run(
        id,
        title
      );
      return db.prepare(get_query).get(id);
    },
    async update(id, title) {
      db.prepare('UPDATE categories SET title=? WHERE id=?').run(title, id);
      return db.prepare(get_query).get(id);
    },
    async remove(id) {
      db.prepare('DELETE FROM categories WHERE id=?').run(id);
      return id;
    },
  };
};

const sqlitePostClient = (db: Database.Database): PostClient => {
  const get_query =
    'SELECT rowid AS id, title, link, category, datetime FROM items WHERE rowid=?';
  return {
    async get(id) {
      return db.prepare(get_query).get(id);
    },
    async list(category) {
      // TODO this could be better
      if (category === undefined) {
        return db
          .prepare('SELECT rowid AS id, title, link, datetime FROM items')
          .all();
      }
      return db
        .prepare(
          'SELECT rowid AS id, title, link, datetime FROM items WHERE category=?'
        )
        .all(category);
    },
    async create(title, link, category, datetime) {
      try {
        const info = db
          .prepare(
            'INSERT INTO items (title, link, category, datetime) VALUES (?, ?, ?, ?)'
          )
          .run(title, link, category, datetime);
        return db.prepare(get_query).get(info.lastInsertRowid);
      } catch (err: unknown) {
        // TODO improve error game
        throw new Error('Could not insert');
      }
    },
    async update(id, title, link, category, datetime) {
      // TODO make non-destructive
      // TODO no check if it doesn't exist
      db.prepare(
        'UPDATE items SET title=?, link=?, category=?, datetime=? WHERE rowid=?'
      ).run(title, link, category, datetime, id);
      return db.prepare(get_query).get(id);
    },
    async remove(id) {
      db.prepare('DELETE FROM items WHERE rowid=?').run(id);
      return id;
    },
  };
};

const sqliteClient = (db: Database.Database): Client => {
  return {
    posts: sqlitePostClient(db),
    categories: sqliteCategoryClient(db),
  };
};

const dynamodbCategoryClient = (
  client: DynamoDBDocumentClient
): CategoryClient => {
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convertRecord = (record: Record<string, any>) => ({
    id: record['id'],
    title: record['title'],
  });
  return {
    async get(id) {
      const params = {
        TableName: 'Items',
        Key: {
          id: id,
          type: 'category',
        },
        ConsistentRead: true,
      };
      return client
        .send(new GetCommand(params))
        .then(({ Item }) =>
          Item === undefined ? undefined : convertRecord(Item)
        );
    },
    async list() {
      const params = {
        TableName: 'Items',
        FilterExpression: '#type = :t',
        ExpressionAttributeValues: {
          ':t': 'category',
        },
        ExpressionAttributeNames: {
          '#type': 'type',
        },
      };
      return client
        .send(new ScanCommand(params))
        .then(({ Items }) =>
          Items === undefined ? [] : Items.map(convertRecord)
        );
    },
    async create(title) {
      const params = {
        TableName: 'Items',
        Item: {
          id: uuidv4(),
          title: title,
          type: 'category',
        },
      };

      const {
        Item: { type, ...category },
      } = params;
      return client.send(new PutCommand(params)).then(() => category);
    },
    async update(id, title) {
      const params = {
        TableName: 'Items',
        Key: {
          id: id,
          type: 'category',
        },
        UpdateExpression: 'SET title = :t',
        ExpressionAttributeValues: {
          ':t': title,
        },
        ReturnValues: 'ALL_NEW',
      };

      return client
        .send(new UpdateCommand(params))
        .then(({ Attributes }) =>
          Attributes == undefined ? undefined : convertRecord(Attributes)
        );
    },
    async remove(id) {
      const params = {
        TableName: 'Items',
        Key: {
          id: id,
          type: 'category',
        },
      };
      return client.send(new DeleteCommand(params)).then(() => id);
    },
  };
};

const dynamodbPostClient = (client: DynamoDBDocumentClient): PostClient => {
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convertRecord = (record: Record<string, any>) => ({
    id: record['id'],
    title: record['title'],
    link: record['link'],
    category: record['category'],
    datetime: record['datetime'],
  });
  return {
    async get(id) {
      const params = {
        TableName: 'Items',
        Key: {
          id: id,
          type: 'post',
        },
        // TODO need for testing but what is impact?
        ConsistentRead: true,
      };
      return client
        .send(new GetCommand(params))
        .then(({ Item }) =>
          Item === undefined ? undefined : convertRecord(Item)
        );
    },
    async list(category) {
      // TODO could be better

      const params =
        category === undefined
          ? {
              TableName: 'Items',
              IndexName: 'post-index',
              FilterExpression: '#type = :t',
              ExpressionAttributeValues: {
                ':t': 'post',
              },
              ExpressionAttributeNames: {
                '#type': 'type',
              },
            }
          : {
              TableName: 'Items',
              IndexName: 'post-index',
              FilterExpression: '#type = :t and category = :c',
              ExpressionAttributeValues: {
                ':t': 'post',
                ':c': category,
              },
              ExpressionAttributeNames: {
                '#type': 'type',
              },
            };
      return client
        .send(new ScanCommand(params))
        .then(({ Items }) =>
          Items === undefined ? [] : Items.map(convertRecord)
        );
    },
    async create(title, link, category, datetime) {
      const getParams = {
        TableName: 'Items',
        Key: {
          id: category,
          type: 'category',
        },
        ConsistentRead: true,
      };

      const params = {
        TableName: 'Items',
        Item: {
          id: uuidv4(),
          type: 'post',
          title: title,
          link: link,
          category: category,
          datetime: datetime,
        },
      };
      const {
        Item: { type, ...post },
      } = params;
      return client.send(new GetCommand(getParams)).then(({ Item }) => {
        if (Item === undefined) {
          throw new Error();
        }
        return client.send(new PutCommand(params)).then(() => post);
      });
    },
    async update(id, title, link, category, datetime) {
      const params = {
        TableName: 'Items',
        Key: {
          id: id,
          type: 'post',
        },
        UpdateExpression:
          'SET title = :t, link = :l, category = :c, #datetime = :d',
        ExpressionAttributeValues: {
          ':t': title,
          ':l': link,
          ':c': category,
          ':d': datetime,
        },
        ExpressionAttributeNames: {
          '#datetime': 'datetime',
        },
        ReturnValues: 'ALL_NEW',
      };

      return client
        .send(new UpdateCommand(params))
        .then(({ Attributes }) =>
          Attributes == undefined ? undefined : convertRecord(Attributes)
        );
    },
    async remove(id) {
      const params = {
        TableName: 'Items',
        Key: {
          id: id,
          type: 'post',
        },
      };
      return client.send(new DeleteCommand(params)).then(() => id);
    },
  };
};

const dynamodbClient = (client: DynamoDBDocumentClient): Client => {
  return {
    posts: dynamodbPostClient(client),
    categories: dynamodbCategoryClient(client),
  };
};

interface clientConfig {
  readonly client: string;
  readonly dbfile?: string;
}

// TODO use enum?
const contentClient = (config: clientConfig): Client | undefined => {
  if (config.client === 'sqlite') {
    return sqliteClient(new Database(config.dbfile || ':memory:'));
  } else if (config.client === 'dynamodb') {
    return dynamodbClient(
      DynamoDBDocumentClient.from(
        new DynamoDBClient({
          region: 'us-east-1',
          endpoint: 'http://localhost:8000',
        })
      )
    );
  }
  return undefined;
};

export {
  dynamodbPostClient,
  sqlitePostClient,
  sqliteClient,
  dynamodbClient,
  sqliteCategoryClient,
  dynamodbCategoryClient,
  Content,
  contentClient,
};
