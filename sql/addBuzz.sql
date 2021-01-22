UPDATE band
SET
	buzz = prev.buzz + adding.buzz,
  level = get_level(prev.buzz + adding.buzz)
FROM
  band AS prev,
  (VALUES ***) AS adding(id, buzz)
WHERE band.id = adding.id AND band.id = prev.id
