import Koa from 'koa';
import Router from '@koa/router';
import render from 'koa-ejs';
import serveStatic from 'koa-static';
import path from 'path';

import { generateBattle, generateWeeks } from './battle';
import { getBandNameGenerator, getSongNameGenerator } from './generator';
import { createTables, testMammoth } from './db';


const app = new Koa();
const router = new Router();
render(app, {
  layout: false,
  root: path.resolve(__dirname, '../views'),
  viewExt: 'ejs',
});

app.use(async ({ response }, next) => {
  await next()
    .catch(err => {
      console.error('Unhandled error:', err.stack);

      response.status = err.statusCode || err.status || 500;
      response.body = err.message;
    });
});

app.use(router
  .get('/', async (ctx) => {
    await ctx.render('weeks', { weeks: await generateWeeks(5) })
  })
  .get('/battle', async ({ render }) => {
    await render('battle', await generateBattle());
  })
  .get('/band', async ({ response }) => {
    const bandGen = await getBandNameGenerator();
    response.body = bandGen.generate();
  })
  .get('/song', async ({ response }) => {
    const songGen = await getSongNameGenerator();
    response.body = songGen.generate();
  })
  .get('/testMammoth', async ({ response }) => {
    await createTables();
    const data = await testMammoth();
    response.body = JSON.stringify(data);
    response.type = 'json';
  })
  .routes());

app.use(serveStatic(path.resolve(__dirname, '../static')));

const port = Number(process.env.PORT) || 8000;
console.log('Listening on port', port);
app.listen({ port });
