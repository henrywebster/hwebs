import { v4 as uuidv4 } from 'uuid';
import { Database } from 'better-sqlite3';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';

interface Content {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: string;
}

interface Client {
  get(id: string): Promise<Content | undefined>;
  list(): Promise<Array<Content>>;
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

const sqliteClient = (db: Database): Client => {
  const get_query =
    'SELECT rowid AS id, title, description, category FROM items WHERE rowid=?';
  return {
    async get(id: string): Promise<Content | undefined> {
      return db.prepare(get_query).get(id);
    },
    async list(): Promise<Array<Content>> {
      return db
        .prepare('SELECT rowid AS id, title, description FROM items')
        .all();
    },
    async create(
      title: string,
      description: string,
      category: string
    ): Promise<Content> {
      const info = db
        .prepare(
          'INSERT INTO items (title, description, category) VALUES (?, ?, ?)'
        )
        .run(title, description, category);
      return db.prepare(get_query).get(info.lastInsertRowid);
    },
    async update(
      id: string,
      title: string,
      description: string,
      category: string
    ): Promise<Content | undefined> {
      // TODO make non-destructive
      // TODO no check if it doesn't exist
      db.prepare(
        'UPDATE items SET title=?, description=?, category=? WHERE rowid=?'
      ).run(title, description, category, id);
      return db.prepare(get_query).get(id);
    },
    async remove(id: string): Promise<string> {
      db.prepare('DELETE FROM items WHERE rowid=?').run(id);
      return id;
    },
  };
};
const dynamodbClient = (client: DynamoDBDocumentClient): Client => {
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convertRecord = (record: Record<string, any>) => ({
    id: record['id'],
    title: record['title'],
    description: record['description'],
    category: record['category'],
  });
  return {
    async get(id: string): Promise<Content | undefined> {
      const params = {
        TableName: 'Items',
        Key: {
          id: id,
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
    async list(): Promise<Array<Content>> {
      const params = {
        TableName: 'Items',
      };
      return client
        .send(new ScanCommand(params))
        .then(({ Items }) =>
          Items === undefined ? [] : Items.map(convertRecord)
        );
    },
    async create(
      title: string,
      description: string,
      category: string
    ): Promise<Content> {
      const params = {
        TableName: 'Items',
        Item: {
          id: uuidv4(),
          title: title,
          description: description,
          category: category,
        },
      };
      return client.send(new PutCommand(params)).then(() => params.Item);
    },
    async update(
      id: string,
      title: string,
      description: string,
      category: string
    ): Promise<Content | undefined> {
      const params = {
        TableName: 'Items',
        Key: {
          id: id,
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
    async remove(id: string): Promise<string> {
      const params = {
        TableName: 'Items',
        Key: {
          id: id,
        },
      };
      return client.send(new DeleteCommand(params)).then(() => id);
    },
  };
};
export { sqliteClient, dynamodbClient };
