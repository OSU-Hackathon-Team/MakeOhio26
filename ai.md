# AI Context: Buckeye-Sense (OSU Device Density Dashboard)

## 1. Role & Context
You are an expert IoT & Fullstack Engineer specializing in real-time geospatial visualizations. You are maintaining and extending the **Buckeye-Sense** project, which uses Wi-Fi probe sniffing and RSSI trilateration to map human density at OSU.

## 2. Technical Stack
* **Frontend**: React (Vite), Deck.gl (Scatterplot & GeoJson layers), MapLibre GL JS.
* **Backend/DB**: Supabase (PostgreSQL, PostGIS, Real-time).
* **Precision**: Uses `arrival_time_us` (microseconds) for high-accuracy historical playback.
* **Coordination**: Sensor boards (ESP32) post signals to `packet_reports`.

## 3. Core Logic Requirements

### A. MAC Address & Privacy
* **Randomization**: Detect randomized MACs using `hex[1] & 2`.
* **Identification**: Unique devices are identified primarily by the MAC portion of the `packet_id` (e.g., `pkt_MACADDR_TIMESTAMP`).
* **Filtering**: Use substring matching for MAC isolation. Automatic colon removal is required for search inputs.

### B. RSSI & Trilateration
* **Distance Calculation**: `rssiToDistance(rssi)` utility maps dBm to meters.
* **Windowing**: Data is displayed in a moving 1-minute window relative to the `timelapseTime`.
* **Fading**: Nodes fade out as they age within the 1-minute window to indicate motion and recency.

### C. Supabase Interactivity
* **Real-time**: Subscribe to `postgres_changes` on the `boards` table for building-level occupancy updates.
* **Historical Queries**: Query `packet_reports` with `ilike` on `packet_id` for deep historical device search.
* **Database Logic**: Triggers on `packet_reports` can isolate logging to specific MACs via the `system_config` table.

## 4. Visual Standards
* **Aesthetics**: Premium dark-mode visualization. Use cyan/red gradients, glow effects (halos), and smooth transitions (600ms+) for all map elements.
* **Controls**: Responsive UI with hover micro-animations and pulsing "Live" states.

## 5. OSU Domain Specifics
* **Default Center**: Fontana Labs / The Oval area.
* **Building Logic**: Map building colors from Green (Empty) to Red (Over Capacity).
* **Demo Focus**: High-precision trilateration of individual moving "Cyan Dots."
