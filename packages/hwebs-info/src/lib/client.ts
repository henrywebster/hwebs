import Database from 'better-sqlite3';
import { sqliteClient, dynamodbClient } from '@hwebs/content-client';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// TODO figure out a better way

const determineClient = () => {
  if (process.env.HWEBS_INFO_CLIENT === 'sqlite') {
    const db = new Database(process.env.HWEBS_INFO_SQLITE_DB_FILE);
    return sqliteClient(db);
  } else if (process.env.HWEBS_INFO_CLIENT === 'dynamodb') {
    const dynamodb = new DynamoDBClient({
      region: process.env.HWEBS_INFO_DYNAMODB_REGION || 'us-east-1',
      endpoint: 'http://localhost:8000',
    });
    const documentClient = DynamoDBDocumentClient.from(dynamodb);
    return dynamodbClient(documentClient);
  }
};

export const client = determineClient();
