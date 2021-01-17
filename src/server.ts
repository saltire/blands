import express, { Request, Response, NextFunction } from 'express';
import Router from 'express-promise-router';
import morgan from 'morgan';
import path from 'path';

import { generateBattle, generateWeeks } from './battle';
import { generateWeeks as generateWeeksDb } from './battleDb';
import { getBandNameGenerator, getSongNameGenerator } from './generator';
import { createTables, aggregateWeeksSimple, getBattleSummary } from './db';
import { getWeeks as getWeeksPrisma } from './prisma';


const app = express();

app.use(morgan('dev'));
app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, '../views'));

const router = Router();

router.get('/', async (req, res) => {
  res.render('weeks', { weeks: await generateWeeks() });
});
router.get('/json', async (req, res) => {
  res.json({ weeks: await generateWeeks() });
});
router.get('/battle', async (req, res) => {
  res.render('battle', { battle: await generateBattle() });
});
router.get('/battle/json', async (req, res) => {
  res.json({ battle: await generateBattle() });
});

router.get('/db', async (req, res) => {
  res.render('weeksDb', { weeks: await aggregateWeeksSimple() });
});
router.get('/db/json', async (req, res) => {
  res.json({ weeks: await aggregateWeeksSimple() });
});
router.get('/db/battle/:id', async (req, res) => {
  res.render('battle', { battle: await getBattleSummary(Number(req.params.id)) });
});
router.get('/db/battle/:id/json', async (req, res) => {
  res.json({ battle: await getBattleSummary(Number(req.params.id)) });
});
router.get('/db/reset', async (req, res) => {
  await createTables(true);
  await generateWeeksDb();
  res.redirect('/db');
});
router.post('/db/addWeek', async (req, res) => {
  await generateWeeksDb({ weekCount: 1 });
  res.redirect('/db');
});
router.post('/db/clear', async (req, res) => {
  await createTables(true);
  // await clearTables();
  res.redirect('/db');
});

router.get('/band', async (req, res) => {
  const bandGen = await getBandNameGenerator();
  res.send(bandGen.generate());
});
router.get('/song', async (req, res) => {
  const songGen = await getSongNameGenerator();
  res.send(songGen.generate());
});

router.get('/prisma/json', async (req, res) => {
  res.json({ weeks: await getWeeksPrisma() });
});

app.use(router);
app.use(express.static(path.resolve(__dirname, '../static')));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).send(err.message);
});

const port = Number(process.env.PORT) || 8000;
app.listen(port, () => console.log(`Listening on port ${port}.`));
