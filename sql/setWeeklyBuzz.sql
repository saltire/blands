INSERT INTO weekly_buzz (week_id, band_id, buzz)
SELECT $1, id, buzz FROM band
