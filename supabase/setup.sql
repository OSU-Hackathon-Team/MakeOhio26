-- Enable PostGIS for spatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Buildings Table (Updated with Polygons)
CREATE TABLE IF NOT EXISTS buildings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    capacity INTEGER DEFAULT 100,
    current_count INTEGER DEFAULT 0,
    geom GEOMETRY(Polygon, 4326), -- PostGIS geometry for spatial intersections
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Monitoring Boards Table
CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL -- Fixed coordinates of the ESP32
);

-- 3. High-Precision Packet Reports (Ingestion Table)
-- Boards send data here as fast as they can.
CREATE TABLE IF NOT EXISTS packet_reports (
    id BIGSERIAL PRIMARY KEY,
    packet_id TEXT NOT NULL,       -- Shared ID for the same physical packet across boards
    board_id TEXT REFERENCES boards(id),
    device_hash TEXT NOT NULL,     -- Anonymized MAC
    arrival_time_us BIGINT NOT NULL, -- Microsecond timestamp from the board
    rssi INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index to quickly find reports for the same packet within a time window
CREATE INDEX IF NOT EXISTS idx_packet_reports_composite ON packet_reports (packet_id, created_at);

-- 4. Triangulated Device Locations
-- This stores the result of the triangulation math.
CREATE TABLE IF NOT EXISTS triangulated_devices (
    device_hash TEXT PRIMARY KEY,
    location GEOMETRY(Point, 4326),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. FUNCTION: Perform Triangulation (Weighted Approximation for Hackathon)
-- Real TDOA usually requires more complex solvers, but we can do a weighted
-- average of board locations based on RSSI or Time for the demo.
CREATE OR REPLACE FUNCTION calculate_triangulation()
RETURNS TRIGGER AS $$
DECLARE
    report_count INTEGER;
    avg_geom GEOMETRY;
BEGIN
    -- Check if we have at least 3 reports for this packet in the last 2 seconds
    SELECT COUNT(*), ST_Centroid(ST_Collect(b.location))
    INTO report_count, avg_geom
    FROM packet_reports pr
    JOIN boards b ON pr.board_id = b.id
    WHERE pr.packet_id = NEW.packet_id
      AND pr.created_at > (NOW() - INTERVAL '2 seconds');

    IF report_count >= 3 THEN
        -- Insert or Update the device location
        INSERT INTO triangulated_devices (device_hash, location, last_seen)
        VALUES (NEW.device_hash, avg_geom, to_timestamp(NEW.arrival_time_us / 1000000.0))
        ON CONFLICT (device_hash) DO UPDATE
        SET location = EXCLUDED.location, last_seen = EXCLUDED.last_seen;

        -- Update occupancy for the building that contains this point
        -- This is the "Magic" that ties triangulation to your 3D buildings!
        UPDATE buildings
        SET 
            current_count = (
                SELECT COUNT(DISTINCT device_hash)
                FROM triangulated_devices
                WHERE ST_Contains(buildings.geom, location)
                  AND last_seen > (NOW() - INTERVAL '5 minutes')
            ),
            last_updated = NOW()
        WHERE ST_Contains(geom, avg_geom);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run on every incoming report
DROP TRIGGER IF EXISTS trg_packet_triangulation ON packet_reports;
CREATE TRIGGER trg_packet_triangulation
AFTER INSERT ON packet_reports
FOR EACH ROW
EXECUTE FUNCTION calculate_triangulation();

-- Realtime Settings
ALTER TABLE buildings REPLICA IDENTITY FULL;
ALTER TABLE triangulated_devices REPLICA IDENTITY FULL;

-- Function to update board location via RPC
CREATE OR REPLACE FUNCTION public.update_board_location(board_id TEXT, lat DOUBLE PRECISION, lon DOUBLE PRECISION)
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.boards
    SET location = ST_SetSRID(ST_MakePoint(lon, lat), 4326) -- PostGIS uses (X, Y) which is (Lon, Lat)
    WHERE id = board_id;
END;
$$;

-- SEED DATA: Boards (Example coordinates surrounding Scott House)
INSERT INTO boards (id, name, location)
VALUES 
    ('board_north', 'North Node', ST_SetSRID(ST_MakePoint(-83.0131, 40.0050), 4326)),
    ('board_south', 'South Node', ST_SetSRID(ST_MakePoint(-83.0131, 40.0042), 4326)),
    ('board_east', 'East Node', ST_SetSRID(ST_MakePoint(-83.0125, 40.0046), 4326))
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    location = EXCLUDED.location;
