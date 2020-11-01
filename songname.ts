const pick = (array: any[]) => array[Math.floor(Math.random() * array.length)];

async function jsonToCsv() {
  const data: { string: string } = await Deno.readTextFile('./songname.json')
    .then(JSON.parse);

  const columns = Object.fromEntries(
    Object.entries(data).map(([header, string]) => [header, string.split(',')]));

  const rows = [
    Object.keys(columns),
    ...columns.adjective
      .map((_, i) => Object.values(columns).map(entries => entries[i] || '')),
  ];

  await Deno.writeTextFile('songname.csv', rows.map(row => row.join(',')).join('\n'));
}

async function csvToMap() {
  const data = await Deno.readTextFile('./songname.csv');
  const rows = data.split('\n').map(row => row.split(','));
  return Object.fromEntries(
    rows[0].map((header, c) => [header,
      rows.slice(1).map(row => row[c]).filter((val, v) => val || v === 0)]));
}

async function main() {
  const map = await csvToMap();

  let title = pick(map.songName);

  while (title.includes('$')) {
    title = title.replace(/\$\{(.+?)\}/g, (_: string, key: string) => pick(map[key]));
  }

  console.log(title);
}

main();
