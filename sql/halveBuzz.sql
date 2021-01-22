UPDATE band
SET
  buzz = buzz / 2,
  level = GREATEST(1, LEAST(5, floor(log10(buzz / 2))))
