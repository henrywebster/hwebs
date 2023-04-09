import { contentClient } from '@hwebs/content-client';

export const client = contentClient({
  client: process.env.HWEBS_INFO_CLIENT,
  dbfile: process.env.HWEBS_INFO_SQLITE_DB_FILE,
  port: process.env.HWEBS_INFO_DYNAMODB_PORT,
  tableName: process.env.HWEBS_INFO_DYNAMODB_TABLE_NAME,
  endpoint: process.env.HWEBS_INFO_DYNAMODB_ENDPOINT,
  region: process.env.HWEBS_INFO_DYNAMODB_REGION,
  protocol: process.env.HWEBS_INFO_DYNAMODB_PROTOCOL,
});
