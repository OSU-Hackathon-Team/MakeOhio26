# Arduino/ESP32 Ingestion Guide

The Arduino should send an HTTP POST request to the Supabase REST API to log detected devices.

## Endpoint
`https://[YOUR_PROJECT_REF].supabase.co/rest/v1/device_logs`

## Headers
- `apikey`: [YOUR_ANON_KEY]
- `Authorization`: Bearer [YOUR_ANON_KEY]
- `Content-Type`: application/json
- `Prefer`: return=representation

## JSON Payload
```json
{
  "building_id": "scott_house",
  "device_hash": "a1b2c3d4e5f6...",
  "rssi": -65
}
```

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
