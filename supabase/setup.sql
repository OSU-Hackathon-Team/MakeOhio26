-- Create Buildings Table
CREATE TABLE IF NOT EXISTS buildings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    capacity INTEGER DEFAULT 100,
    current_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Device Logs Table
CREATE TABLE IF NOT EXISTS device_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id TEXT REFERENCES buildings(id),
    device_hash TEXT NOT NULL,
    rssi INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster occupancy calculation
CREATE INDEX IF NOT EXISTS idx_device_logs_building_time ON device_logs (building_id, created_at);

-- Function to update building occupancy
-- Counts unique device hashes in the last 5 minutes for a building
CREATE OR REPLACE FUNCTION update_occupancy_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE buildings
    SET 
        current_count = (
            SELECT COUNT(DISTINCT device_hash)
            FROM device_logs
            WHERE building_id = NEW.building_id
              AND created_at > (NOW() - INTERVAL '5 minutes')
        ),
        last_updated = NOW()
    WHERE id = NEW.building_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update occupancy on every new log insert
DROP TRIGGER IF EXISTS trg_update_occupancy ON device_logs;
CREATE TRIGGER trg_update_occupancy
AFTER INSERT ON device_logs
FOR EACH ROW
EXECUTE FUNCTION update_occupancy_count();

-- Enable Realtime for buildings table
ALTER TABLE buildings REPLICA IDENTITY FULL;
-- Note: You must also enable the "Realtime" publication in the Supabase Dashboard:
-- Database -> Publications -> supabase_realtime -> Add 'buildings' table.

-- Seed some initial buildings if not present
INSERT INTO buildings (id, name, capacity)
VALUES 
    ('scott_house', 'Scott House', 200),
    ('drackett_tower', 'Drackett Tower', 600),
    ('taylor_tower', 'Taylor Tower', 600),
    ('jones_tower', 'Jones Tower', 450),
    ('knowlton_hall', 'Knowlton Hall', 300),
    ('thompson_library', 'Thompson Library', 1000),
    ('blackburn_house', 'Blackburn House', 350),
    ('nosker_house', 'Nosker House', 400),
    ('torres_house', 'Torres House', 350),
    ('raney_house', 'Raney House', 350),
    ('busch_house', 'Busch House', 350),
    ('bowen_house', 'Bowen House', 350),
    ('bolz_hall', 'Bolz Hall', 250),
    ('hitchcock_hall', 'Hitchcock Hall', 400),
    ('caldwell_lab', 'Caldwell Lab', 300)
ON CONFLICT (id) DO NOTHING;
