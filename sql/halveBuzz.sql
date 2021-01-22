UPDATE band
SET
  buzz = buzz / 2,
  level = get_level(buzz / 2)
