import run from '@databases/pg-schema-cli';


run(__dirname,
  [
    '--database', process.env.DATABASE_URL || '',
    '--directory', '__generated__',
  ])
  .catch(console.error)
  .finally(process.exit);
