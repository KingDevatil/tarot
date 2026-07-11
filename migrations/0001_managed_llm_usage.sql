CREATE TABLE IF NOT EXISTS managed_llm_usage (
  visitor_hash TEXT NOT NULL,
  usage_date TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success')),
  response_json TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (visitor_hash, usage_date, request_hash)
);

CREATE INDEX IF NOT EXISTS managed_llm_usage_daily
  ON managed_llm_usage (visitor_hash, usage_date);

CREATE TRIGGER IF NOT EXISTS managed_llm_daily_limit
BEFORE INSERT ON managed_llm_usage
WHEN (
  SELECT COUNT(*)
  FROM managed_llm_usage
WHERE visitor_hash = NEW.visitor_hash
    AND usage_date = NEW.usage_date
  AND status IN ('pending', 'success')
) >= 5
BEGIN
  SELECT RAISE(ABORT, 'daily_quota_exhausted');
END;
