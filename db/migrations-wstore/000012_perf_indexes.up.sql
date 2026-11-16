CREATE INDEX IF NOT EXISTS idx_tevent_ts_event ON db_tevent (ts, event);
CREATE INDEX IF NOT EXISTS idx_activity_uploaded ON db_activity (uploaded);
