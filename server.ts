import { Application } from 'https://deno.land/x/oak/mod.ts';
import * as flags from 'https://deno.land/std/flags/mod.ts';

import generate from './songname.ts';


const app = new Application();

app.use(async ({ response }) => {
  response.body = await generate();
});

const port = Number(flags.parse(Deno.args).port) || 8000;
await app.listen({ port });
