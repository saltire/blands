import run from '@databases/pg-schema-cli';
import path from 'path';


run(__dirname,
  [
    '--database', process.env.DATABASE_URL || '',
    '--directory', path.resolve(__dirname, '../__generated__'),
  ])
  .catch(console.error)
  .finally(process.exit);
