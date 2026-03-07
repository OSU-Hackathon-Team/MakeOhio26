# Project: OSU 3D Real-Time Device Density Explorer

## 1. Objective
A 3D dashboard mapping real-time device density across OSU buildings using Arduino sniffers. 
**Backend Strategy:** Supabase (PostgreSQL + Real-time) to handle device logs and push updates to the React/Deck.gl frontend.

## 2. Tech Stack
* **Frontend:** React (Vite), Deck.gl + MapLibre GL JS, Tailwind CSS.
* **Database/Backend:** Supabase (Auth, Database, Real-time).
* **Hardware:** ESP32/Arduino (HTTP POST to Supabase Edge Functions or REST API).

## 3. Supabase Schema (Draft)
* **Table: `buildings`**
  - `id` (text, primary key - e.g., 'thompson_library')
  - `name` (text)
  - `capacity` (int)
  - `current_count` (int)
  - `coordinates` (geometry/point)
* **Table: `device_logs`**
  - `id` (uuid)
  - `building_id` (foreign key)
  - `device_hash` (text - hashed MAC for privacy)
  - `rssi` (int)
  - `created_at` (timestamp)

## 4. Frontend-DB Interaction
* **Initial Load:** Fetch all building counts from the `buildings` table.
* **Real-time:** Subscribe to `buildings` table changes using `supabase.channel()`. When a row updates, trigger a Deck.gl layer re-render.