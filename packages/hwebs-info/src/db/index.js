const Database = require('better-sqlite3');
const fs = require('fs');

const seeding = fs.readFileSync('packages/hwebs-info/src/db/seeding.sql', {
  encoding: 'utf-8',
});

const db = new Database('packages/hwebs-info/src/db/test.db');
db.exec(seeding);
