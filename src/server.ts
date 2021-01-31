import express, { Request, Response, NextFunction } from 'express';
import Router from 'express-promise-router';
import morgan from 'morgan';
import path from 'path';

import { generateWeek } from './battle';
import {
  createFunctions, createTables, getWeekSummaries, getBattleSummary, getBandSummary, getBands,
  getAllWeeklyBuzz,
} from './db';
import { getBandNameGenerator, getSongNameGenerator } from './generator';


const app = express();

app.use(morgan('dev'));
app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, '../views'));

const router = Router();

router.get('/', async (req, res) => {
  res.render('weeks', { weeks: await getWeekSummaries() });
});
router.get('/json', async (req, res) => {
  res.json({ weeks: await getWeekSummaries() });
});

router.get('/battle/:id', async (req, res) => {
  res.render('battle', { battle: await getBattleSummary(Number(req.params.id)) });
});
router.get('/battle/:id/json', async (req, res) => {
  res.json({ battle: await getBattleSummary(Number(req.params.id)) });
});

router.get('/band/:id', async (req, res) => {
  res.render('band', { band: await getBandSummary(Number(req.params.id)) });
});
router.get('/band/:id/json', async (req, res) => {
  res.json({ band: await getBandSummary(Number(req.params.id)) });
});

router.get('/bands', async (req, res) => {
  res.render('bands', { bands: await getBands() });
});
router.get('/bands/json', async (req, res) => {
  res.json({ bands: await getBands() });
});

router.get('/graph', async (req, res) => {
  res.render('graph', { bands: JSON.stringify(await getAllWeeklyBuzz()) });
});
router.get('/graph/json', async (req, res) => {
  res.json({ data: await getAllWeeklyBuzz() });
});

router.get('/admin', async (req, res) => {
  res.render('weeks', { weeks: await getWeekSummaries(), admin: true });
});
router.post('/admin/addWeek', async (req, res) => {
  await generateWeek();
  res.redirect('/admin');
});
router.post('/admin/clear', async (req, res) => {
  await createFunctions();
  await createTables(true);
  res.redirect('/admin');
});
router.get('/admin/clear', async (req, res) => {
  await createFunctions();
  await createTables(true);
  res.redirect('/admin');
});

router.get('/band', async (req, res) => {
  const bandGen = await getBandNameGenerator();
  res.send(bandGen.generate());
});
router.get('/song', async (req, res) => {
  const songGen = await getSongNameGenerator();
  res.send(songGen.generate());
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
