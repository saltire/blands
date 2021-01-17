import Koa from 'koa';
import Router from '@koa/router';
import logger from 'koa-logger';
import render from 'koa-ejs';
import serveStatic from 'koa-static';
import path from 'path';

import { generateBattle, generateWeeks } from './battle';
import { generateWeeks as generateWeeksDb, getWeeks as getWeeksDb, getWeeksSimple } from './battleDb';
import { getBandNameGenerator, getSongNameGenerator } from './generator';
import { createTables, clearTables } from './db';
import { getWeeks as getWeeksPrisma } from './prisma';


const app = new Koa();
app.use(logger());
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
  .get('/', async ctx => {
    await ctx.render('weeks', { weeks: await generateWeeks() });
  })
  .get('/json', async ({ response }) => {
    response.body = JSON.stringify({ weeks: await generateWeeks() });
    response.type = 'json';
  })
  .get('/battle', async ctx => {
    await ctx.render('battle', await generateBattle());
  })
  .get('/db', async ctx => {
    await ctx.render('weeksDb', { weeks: await getWeeksDb() });
  })
  .get('/db/json', async ({ response }) => {
    response.body = JSON.stringify({ weeks: await getWeeksSimple() });
    response.type = 'json';
  })
  .get('/db/reset', async ctx => {
    await createTables(true);
    await generateWeeksDb();
    ctx.redirect('/db');
  })
  .post('/db/addWeek', async ({ response }) => {
    await generateWeeksDb({ weekCount: 1 });
    response.redirect('/db');
  })
  .post('/db/clear', async ({ response }) => {
    await clearTables();
    response.redirect('/db');
  })
  .get('/band', async ({ response }) => {
    const bandGen = await getBandNameGenerator();
    response.body = bandGen.generate();
  })
  .get('/song', async ({ response }) => {
    const songGen = await getSongNameGenerator();
    response.body = songGen.generate();
  })
  .get('/prisma/json', async ({ response }) => {
    response.body = JSON.stringify({ weeks: await getWeeksPrisma() });
    response.type = 'json';
  })
  .routes());

app.use(serveStatic(path.resolve(__dirname, '../static')));

const port = Number(process.env.PORT) || 8000;
console.log('Listening on port', port);
app.listen({ port });
