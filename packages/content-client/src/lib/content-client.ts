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
}

const mapClient = (data: Map<string, string>) => {
  return {
    async get(id: string): Promise<Content | undefined> {
      if (!data.has(id)) {
        return undefined;
      }
      return { id: id, title: data.get(id)! };
    },
    async list(): Promise<Array<Content>> {
      return Array.from(data).map(([k, v]) => ({ id: k, title: v }));
    },
    async create(title: string): Promise<Content> {
      const id = uuidv4();
      data.set(id, title);
      return { id: id, title: title };
    },
    async update(id: string, title: string): Promise<Content | undefined> {
      if (!data.has(id)) {
        return undefined;
      }
      data.set(id, title);
      return { id: id, title: title };
    },
    async remove(id: string): Promise<String> {
      data.delete(id);
      return id;
    },
  };
};

const sqliteClient = (db: Database) => {
  const get_query = 'SELECT rowid AS id, title FROM items WHERE rowid=?';
  return {
    async get(id: string): Promise<Content | undefined> {
      return db.prepare(get_query).get(id);
    },
    async list(): Promise<Array<Content>> {
      return db.prepare('SELECT rowid AS id, title FROM items').all();
    },
    async create(title: string): Promise<Content> {
      const info = db
        .prepare('INSERT INTO items (title) VALUES (?)')
        .run(title);
      return db.prepare(get_query).get(info.lastInsertRowid);
    },
    async update(id: string, title: string): Promise<Content> {
      // TODO make non-destructive
      // TODO no check if it doesn't exist
      db.prepare('UPDATE items SET title=? WHERE rowid=?').run(title, id);
      return db.prepare(get_query).get(id);
    },
    async remove(id: string): Promise<string> {
      db.prepare('DELETE FROM items WHERE rowid=?').run(id);
      return id;
    },
  };
};
const dynamodbClient = (client: DynamoDBDocumentClient) => {
  return {
    async get(id: string): Promise<Content | undefined> {
      const params = {
        TableName: 'Items',
        Key: {
          Id: id,
        },
        // TODO need for testing but what is impact?
        ConsistentRead: true,
      };
      return client
        .send(new GetCommand(params))
        .then(({ Item }) =>
          Item === undefined
            ? undefined
            : { id: Item['Id'], title: Item['Title'] }
        );
    },
    async list(): Promise<Array<Content>> {
      const params = {
        TableName: 'Items',
      };
      return client
        .send(new ScanCommand(params))
        .then(({ Items }) =>
          Items === undefined
            ? []
            : Items.map((item) => ({ id: item['Id'], title: item['Title'] }))
        );
    },
    async create(title: string): Promise<Content> {
      const params = {
        TableName: 'Items',
        Item: {
          Id: uuidv4(),
          Title: title,
        },
      };
      return client
        .send(new PutCommand(params))
        .then(() => ({ id: params.Item['Id'], title: params.Item['Title'] }));
    },
    async update(id: string, title: string): Promise<Content | undefined> {
      const params = {
        TableName: 'Items',
        Key: {
          Id: id,
        },
        UpdateExpression: 'SET #t = :t',
        ExpressionAttributeValues: {
          ':t': title,
        },
        ExpressionAttributeNames: {
          '#t': 'Title',
        },
        ReturnValues: 'ALL_NEW',
      };

      return client.send(new UpdateCommand(params)).then(({ Attributes }) =>
        Attributes == undefined
          ? undefined
          : {
              id: Attributes['Id'],
              title: Attributes['Title'],
            }
      );
    },
    async remove(id: string): Promise<string> {
      const params = {
        TableName: 'Items',
        Key: {
          Id: id,
        },
      };
      return client.send(new DeleteCommand(params)).then(() => id);
    },
  };
};
export { mapClient, sqliteClient, dynamodbClient };
