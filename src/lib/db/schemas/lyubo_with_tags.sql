-- =========================================================
-- lyubo_with_tags.sql
-- Aggregated read-only view
-- =========================================================
CREATE OR REPLACE VIEW lyubo_with_tags AS
SELECT
  l.id,
  l.name,
  l.rating,
  l.review,
  l.favorite,
  l.watched_on,
  l.created_at,
  COALESCE(jsonb_agg(t.id ORDER BY t.id) FILTER (WHERE t.id IS NOT NULL), '[]'::jsonb) AS tags
FROM
  lyubo l
  LEFT JOIN lyubo_tags lt ON lt.lyubo_id = l.id
  LEFT JOIN tags t ON t.id = lt.tag_id
GROUP BY
  l.id,
  l.name,
  l.rating,
  l.review,
  l.favorite,
  l.watched_on,
  l.created_at;

