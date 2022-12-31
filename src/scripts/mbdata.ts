import { sql } from '@databases/pg';
import path from 'path';

import { writeCsv } from '../csv';
import db from '../db';


type GenreResult = {
  name: string,
  ref_count: number | null,
  aliases: string[],
  links: {
    link_type: string,
    genres: string[],
  }[],
};

async function exportGenres() {
  const rows: GenreResult[] = await db.query(sql`
    SELECT
      mb_genre.name,
      mb_tag.ref_count,

      array_to_json(array(
        SELECT mb_genre_alias.name
        FROM mb_genre_alias
        WHERE mb_genre_alias.genre = mb_genre.id
        ORDER BY mb_genre_alias.name
      )) AS aliases,

      array_to_json(array(
        SELECT json_build_object(
          'link_type', linked.link_type,
          'genres', json_agg(linked.genre ORDER BY linked.genre)
        )
        FROM (
          SELECT
              mb_link_type.link_phrase as link_type,
              linked_genre.name as genre
          FROM mb_l_genre_genre
          JOIN mb_link ON mb_link.id = mb_l_genre_genre.link
          JOIN mb_link_type ON mb_link_type.id = mb_link.link_type
          JOIN mb_genre AS linked_genre ON linked_genre.id = mb_l_genre_genre.entity1
          WHERE mb_l_genre_genre.entity0 = mb_genre.id

          UNION

          SELECT
              mb_link_type.reverse_link_phrase as link_type,
              linked_genre.name as genre
          FROM mb_l_genre_genre
          JOIN mb_link ON mb_link.id = mb_l_genre_genre.link
          JOIN mb_link_type ON mb_link_type.id = mb_link.link_type
          JOIN mb_genre AS linked_genre ON linked_genre.id = mb_l_genre_genre.entity0
          WHERE mb_l_genre_genre.entity1 = mb_genre.id
        ) linked
        GROUP BY linked.link_type
      )) AS links

    FROM mb_genre
    LEFT JOIN mb_tag USING (name)
    ORDER BY ref_count DESC NULLS LAST
  `);

  await writeCsv(
    rows.map(({ name, ref_count: count, aliases, links }) => ({
      name,
      count: count || 0,
      aliases: `"${aliases.join(', ')}"`,
      ...Object.fromEntries(links.map(link => [link.link_type, `"${link.genres.join(', ')}"`])),
    })),
    path.resolve(__dirname, '../../data/genres.csv'));
}

exportGenres()
  .catch(console.error)
  .finally(process.exit);
