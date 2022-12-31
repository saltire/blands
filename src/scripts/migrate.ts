import { migrate } from '../db';


migrate()
  .catch(console.error)
  .finally(process.exit);
