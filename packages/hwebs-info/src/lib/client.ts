import { contentClient } from '@hwebs/content-client';

export const client = contentClient({
  client: process.env.HWEBS_INFO_CLIENT,
  dbfile: process.env.HWEBS_INFO_SQLITE_DB_FILE,
  port: process.env.HWEBS_INFO_DYNAMODB_PORT,
});
