CREATE OR REPLACE FUNCTION get_level(buzz integer)
  RETURNS integer
  AS 'SELECT GREATEST(1, LEAST(5, floor(log10(buzz))))::int'
  LANGUAGE sql;
