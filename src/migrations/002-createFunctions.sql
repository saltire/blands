CREATE OR REPLACE FUNCTION get_level(buzz integer)
  RETURNS integer
  AS 'SELECT LEAST(5, floor(log10(GREATEST(1, buzz))))::int'
  LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_base_buzz(level integer)
  RETURNS integer
  AS 'SELECT power(10, level)::int'
  LANGUAGE sql;
