# Arduino/ESP32 Ingestion Guide

The Arduino/ESP32 boards should send an HTTP POST request to the Supabase REST API to log detected packets.

## Endpoint
`https://[YOUR_PROJECT_REF].supabase.co/rest/v1/packet_reports`

## Headers
- `apikey`: [YOUR_ANON_KEY]
- `Authorization`: Bearer [YOUR_ANON_KEY]
- `Content-Type`: application/json
- `Prefer`: return=representation

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
- **`packet_id`**: This must be **identical** for the same physical packet seen by different boards. Use a hash of the packet payload or a combination of `MAC + Sequence Number`.
- **`arrival_time_us`**: High-precision timestamp in microseconds from the ESP32 to allow for TDOA calculation.
- **`board_id`**: Identifier for the board (e.g., `board_north`, `board_south`, `board_east`).
- **`device_hash`**: The hashed MAC address for privacy.

## 📐 PostGIS Triangulation Engine
The backend now uses a spatial trigger (`calculate_triangulation`) to determine which building a device is in.
1. **Report Ingestion**: Packet reports are stored in `packet_reports`.
2. **Triangulation**: Every new report triggers a check for other reports with the same `packet_id`.
3. **Centroid Intersection**: If 3+ boards see a packet, a centroid point is calculated.
4. **Occupancy Update**: If that point falls inside a `building.geom`, that building's count increments.

## Privacy & Accuracy Logic (Arduino-side recommendation)
As per project requirements:
1. **Randomization Check**: If the second character of the MAC is `2, 6, A, or E`, it is a randomized MAC.
2. **Hashing**: Never send the raw MAC. Hash it with a salt on the Arduino before sending.
3. **RSSI Filter**: Only send data if `RSSI > -70 dBm` (to ensure they are actually "in" the building).

## Hardware Setup
- **Boards**: 3 ESP32 units positioned at the corners of the target area.
- **Protocol**: 802.11 monitor mode to capture Probe Requests.
- **Sync**: Use NTP or a shared trigger to ensure `arrival_time_us` is relatively synchronized across boards.
