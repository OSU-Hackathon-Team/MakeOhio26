# Arduino/ESP32 Ingestion Guide

The Arduino should send an HTTP POST request to the Supabase REST API to log detected devices.

## Endpoint
`https://[YOUR_PROJECT_REF].supabase.co/rest/v1/packet_reports`

## JSON Payload
```json
{
  "packet_id": "pkt_hash_12345", 
  "board_id": "board_north",
  "device_hash": "a1b2c3d4e5f6...",
  "arrival_time_us": 1710000000000,
  "rssi": -65
}
```

### Key Fields for Triangulation
- **`packet_id`**: This must be **identical** for the same physical packet seen by different boards. Use a hash of the packet payload or the MAC + Sequence Number.
- **`arrival_time_us`**: High-precision timestamp in microseconds from the ESP32.
- **`board_id`**: Identifier for the board (e.g., `board_north`, `board_south`, `board_east`).

## Privacy & Accuracy Logic (Arduino-side recommendation)
As per project requirements:
1. **Randomization Check**: If the second character of the MAC is `2, 6, A, or E`, it is a randomized MAC.
2. **Hashing**: Never send the raw MAC. Hash it with a salt on the Arduino before sending.
3. **RSSI Filter**: Only send data if `RSSI > -70 dBm` (to ensure they are actually "in" the building).

## SQL Helper (Optional RPC)
If you want to use a Supabase RPC function instead of a direct table insert, you can use this function:

```sql
-- Call this via POST /rest/v1/rpc/log_device
CREATE OR REPLACE FUNCTION log_device(
    p_building_id TEXT,
    p_device_hash TEXT,
    p_rssi INTEGER
) RETURNS VOID AS $$
BEGIN
    INSERT INTO device_logs (building_id, device_hash, rssi)
    VALUES (p_building_id, p_device_hash, p_rssi);
END;
$$ LANGUAGE plpgsql;
```
