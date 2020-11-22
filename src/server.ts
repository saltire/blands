import { Application, Router } from 'https://deno.land/x/oak/mod.ts';
// import { organ } from 'https://raw.githubusercontent.com/denjucks/organ/master/mod.ts';
import { renderFile } from 'https://raw.githubusercontent.com/syumai/dejs/0.9.0/mod.ts';
import * as flags from 'https://deno.land/std/flags/mod.ts';

import { generateBattle } from './battle.ts';
import Generator from './generator.ts';


const bandGen = Generator.bandGenerator();
const songGen = Generator.songGenerator();

const app = new Application();
// app.use(organ());
const router = new Router();

app.use(async ({ response }, next) => {
  await next()
    .catch(err => {
      console.error('Unhandled error:', err.stack);

      response.status = err.statusCode || err.status || 500;
      response.body = err.message;
    });
});

app.use(router
  .get('/', async ({ response }) => {
    response.body = await renderFile('views/battle.ejs', await generateBattle());
  })
  .get('/band', async ({ response }) => {
    response.body = await bandGen.generate();
  })
  .get('/song', async ({ response }) => {
    response.body = await songGen.generate();
  })
  .routes());

app.use(async (context) => {
  await context.send({ root: 'static' });
});

const port = Number(flags.parse(Deno.args).port) || 8000;
console.log('Listening on port', port);
await app.listen({ port });
