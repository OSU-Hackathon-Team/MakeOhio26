# Project: OSU 3D Real-Time Device Density Explorer

## 1. Objective
A 3D dashboard mapping real-time device density across OSU buildings using Arduino sniffers. 
**Backend Strategy:** Supabase (PostgreSQL + Real-time) to handle device logs and push updates to the React/Deck.gl frontend.

## 2. Tech Stack
* **Frontend:** React (Vite), Deck.gl + MapLibre GL JS, Tailwind CSS.
* **Database/Backend:** Supabase (Auth, Database, Real-time).
* **Hardware:** ESP32/Arduino (HTTP POST to Supabase Edge Functions or REST API).

## 3. Final Supabase Schema
* **Table: `buildings`**
  - `id` (text, primary key)
  - `name` (text)
  - `capacity` (int)
  - `occupancy` (int) - Live count
  - `geom` (geometry/polygon) - PostGIS footprint
* **Table: `packet_reports`**
  - `packet_id` (text, primary key) - Format: `pkt_MACADDR_TIMESTAMP`
  - `board_id` (text)
  - `device_hash` (text)
  - `rssi` (int)
  - `arrival_time_us` (bigint) - Microsecond precision
  - `esp_timestamp_ms` (bigint)
  - `esp_report_ms` (bigint)
  - `created_at` (timestamp)
* **Table: `system_config`**
  - `key` (text, primary key)
  - `value` (text) - Stores `focused_mac_address`

## 4. Frontend-DB Interaction
* **Initial Load:** Fetch all building counts from the `buildings` table.
* **Real-time:** Subscribe to `buildings` table changes using `supabase.channel()`. When a row updates, trigger a Deck.gl layer re-render.