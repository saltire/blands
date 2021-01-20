import express, { Request, Response, NextFunction } from 'express';
import Router from 'express-promise-router';
import morgan from 'morgan';
import path from 'path';

import { generateWeeks } from './battle';
import { createTables, aggregateWeeks, getBattleSummary } from './db';
import { getBandNameGenerator, getSongNameGenerator } from './generator';


const app = express();

app.use(morgan('dev'));
app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, '../views'));

const router = Router();

router.get('/', async (req, res) => {
  res.render('weeks', { weeks: await aggregateWeeks() });
});
router.get('/admin', async (req, res) => {
  res.render('weeks', { weeks: await aggregateWeeks(), admin: true });
});
router.get('/json', async (req, res) => {
  res.json({ weeks: await aggregateWeeks() });
});
router.get('/battle/:id', async (req, res) => {
  res.render('battle', { battle: await getBattleSummary(Number(req.params.id)) });
});
router.get('/battle/:id/json', async (req, res) => {
  res.json({ battle: await getBattleSummary(Number(req.params.id)) });
});
router.post('/addWeek', async (req, res) => {
  await generateWeeks({ weekCount: 1 });
  res.redirect('/');
});
router.post('/clear', async (req, res) => {
  await createTables(true);
  res.redirect('/');
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
