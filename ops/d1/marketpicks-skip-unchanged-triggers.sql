CREATE TRIGGER IF NOT EXISTS quotes_skip_unchanged BEFORE UPDATE ON quotes
WHEN NEW.price IS OLD.price AND NEW.pct_change IS OLD.pct_change AND NEW.week_change IS OLD.week_change AND NEW.volume IS OLD.volume
 AND NEW.class IS OLD.class AND NEW.symbol IS OLD.symbol AND NEW.source IS OLD.source
 AND julianday(NEW.updated_at) < julianday(OLD.updated_at) + (2.0/24)
BEGIN SELECT RAISE(IGNORE); END;
CREATE TRIGGER IF NOT EXISTS news_skip_unchanged BEFORE UPDATE ON news_items
WHEN NEW.headline IS OLD.headline AND NEW.source IS OLD.source AND NEW.url IS OLD.url AND NEW.catalyst_tags IS OLD.catalyst_tags AND NEW.published_at IS OLD.published_at AND NEW.id IS OLD.id
 AND julianday(NEW.ingested_at) < julianday(OLD.ingested_at) + (6.0/24)
BEGIN SELECT RAISE(IGNORE); END;
CREATE TRIGGER IF NOT EXISTS ipo_skip_unchanged BEFORE UPDATE ON ipo_calendar WHEN NEW.company IS OLD.company AND NEW.ticker IS OLD.ticker AND NEW.exchange IS OLD.exchange AND NEW.expected_date IS OLD.expected_date AND NEW.status IS OLD.status AND NEW.source IS OLD.source AND NEW.data_snapshot IS OLD.data_snapshot AND NEW.id IS OLD.id AND julianday(NEW.last_checked) < julianday(OLD.last_checked) + 0.25 BEGIN SELECT RAISE(IGNORE); END;
CREATE TRIGGER IF NOT EXISTS earnings_skip_unchanged BEFORE UPDATE ON earnings_calendar WHEN NEW.symbol IS OLD.symbol AND NEW.company IS OLD.company AND NEW.date IS OLD.date AND NEW.time IS OLD.time AND NEW.source IS OLD.source AND NEW.id IS OLD.id AND julianday(NEW.last_checked) < julianday(OLD.last_checked) + 0.25 BEGIN SELECT RAISE(IGNORE); END;
CREATE TRIGGER IF NOT EXISTS econ_skip_unchanged BEFORE UPDATE ON econ_markets WHEN NEW.question IS OLD.question AND NEW.probability IS OLD.probability AND NEW.platform IS OLD.platform AND NEW.close_date IS OLD.close_date AND NEW.data_snapshot IS OLD.data_snapshot AND NEW.id IS OLD.id AND julianday(NEW.updated_at) < julianday(OLD.updated_at) + (2.0/24) BEGIN SELECT RAISE(IGNORE); END;
