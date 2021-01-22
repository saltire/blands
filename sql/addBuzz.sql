UPDATE band
SET
	buzz = prev.buzz + adding.buzz,
  level = GREATEST(1, LEAST(5, floor(log10(prev.buzz + adding.buzz))))
FROM
  band AS prev,
  (VALUES ***) AS adding(id, buzz)
WHERE band.id = adding.id AND band.id = prev.id
