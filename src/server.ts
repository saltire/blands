import { Application, Router } from 'https://deno.land/x/oak/mod.ts';
import * as flags from 'https://deno.land/std/flags/mod.ts';

import BandGenerator from './bandname.ts';
import SongGenerator from './songname.ts';
import battle from "./battle.ts";


const app = new Application();
const router = new Router();

const bandGenerator = new BandGenerator();
const songGenerator = new SongGenerator();

router.get('/', async ({ response }) => {
  response.body = JSON.stringify(await battle(), null, 2);
});

router.get('/band', async ({ response }) => {
  response.body = await bandGenerator.generate();
});

router.get('/song', async ({ response }) => {
  response.body = await songGenerator.generate();
});

app.use(router.routes());

const port = Number(flags.parse(Deno.args).port) || 8000;
console.log('Listening on port', port);
await app.listen({ port });
