/*eslint @typescript-eslint/no-unused-vars: ["error", { "ignoreRestSiblings": true }]*/
import { v4 as uuidv4 } from 'uuid';
import { Database } from 'better-sqlite3';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

interface Content {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: string;
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
    description: string,
    category: string
  ): Promise<Content>;
  update(
    id: string,
    title: string,
    description: string,
    category: string
  ): Promise<Content | undefined>;
  remove(id: string): Promise<string>;
}

interface Client {
  posts: PostClient;
  categories: CategoryClient;
}

const sqliteCategoryClient = (db: Database): CategoryClient => {
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

const sqlitePostClient = (db: Database): PostClient => {
  const get_query =
    'SELECT rowid AS id, title, description, category FROM items WHERE rowid=?';
  return {
    async get(id) {
      return db.prepare(get_query).get(id);
    },
    async list(category) {
      // TODO this could be better
      if (category === undefined) {
        return db
          .prepare('SELECT rowid AS id, title, description FROM items')
          .all();
      }
      return db
        .prepare(
          'SELECT rowid AS id, title, description FROM items WHERE category=?'
        )
        .all(category);
    },
    async create(title, description, category) {
      try {
        const info = db
          .prepare(
            'INSERT INTO items (title, description, category) VALUES (?, ?, ?)'
          )
          .run(title, description, category);
        return db.prepare(get_query).get(info.lastInsertRowid);
      } catch (err: unknown) {
        // TODO improve error game
        throw new Error('Could not insert');
      }
    },
    async update(id, title, description, category) {
      // TODO make non-destructive
      // TODO no check if it doesn't exist
      db.prepare(
        'UPDATE items SET title=?, description=?, category=? WHERE rowid=?'
      ).run(title, description, category, id);
      return db.prepare(get_query).get(id);
    },
    async remove(id) {
      db.prepare('DELETE FROM items WHERE rowid=?').run(id);
      return id;
    },
  };
};

const sqliteClient = (db: Database): Client => {
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
    description: record['description'],
    category: record['category'],
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
    async create(title, description, category) {
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
          description: description,
          category: category,
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
    async update(id, title, description, category) {
      const params = {
        TableName: 'Items',
        Key: {
          id: id,
          type: 'post',
        },
        UpdateExpression: 'SET title = :t, description = :d, category = :c',
        ExpressionAttributeValues: {
          ':t': title,
          ':d': description,
          ':c': category,
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

export {
  dynamodbPostClient,
  sqlitePostClient,
  sqliteClient,
  dynamodbClient,
  sqliteCategoryClient,
  dynamodbCategoryClient,
};
