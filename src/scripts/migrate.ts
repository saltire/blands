import { migrate } from '../db2';


migrate()
  .catch(console.error)
  .finally(process.exit);
