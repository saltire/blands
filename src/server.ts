import { Application, Router, send } from 'https://deno.land/x/oak/mod.ts';
import { renderFile } from 'https://raw.githubusercontent.com/syumai/dejs/0.9.0/mod.ts';
import * as flags from 'https://deno.land/std/flags/mod.ts';

import BandGenerator from './bandname.ts';
import SongGenerator from './songname.ts';
import battle from "./battle.ts";


const app = new Application();
const router = new Router();

const bandGenerator = new BandGenerator();
const songGenerator = new SongGenerator();

app.use(router
  .get('/', async ({ response }) => {
    response.body = await renderFile('views/battle.ejs', await battle());
  })
  .get('/band', async ({ response }) => {
    response.body = await bandGenerator.generate();
  })
  .get('/song', async ({ response }) => {
    response.body = await songGenerator.generate();
  })
  .routes());

app.use(async (context) => {
  await context.send({ root: 'static' });
});

const port = Number(flags.parse(Deno.args).port) || 8000;
console.log('Listening on port', port);
await app.listen({ port });
