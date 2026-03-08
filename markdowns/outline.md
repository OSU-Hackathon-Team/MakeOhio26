# Project: OSU 3D Real-Time Device Density Explorer

## 1. Objective
Build a 3D visualization dashboard that maps real-time device density across OSU campus buildings. The system uses Arduino-based Wi-Fi sniffers to capture MAC addresses and signal strengths (RSSI), calculates "Human Presence" metrics, and renders them onto a 3D building map.

## 2. Technical Context
* **Hardware Source:** Arduino/ESP32 sniffing 802.11 Probe Requests.
* **Data Logic:** Filtering MAC addresses for randomization and using RSSI to determine if a device is "In-Building" or "Nearby."
* **Visualization Goal:** Color-code building extrusions based on live device counts relative to known room capacities.

## 3. Tech Stack
* **Framework:** React (Vite)
* **3D Engine:** Deck.gl (for high-performance 3D layers)
* **Base Map:** MapLibre GL JS (via react-map-gl)
* **Styling:** Tailwind CSS
* **Communication:** WebSockets (Socket.io) or Polling for "Live" updates.

## 4. Map Configuration
* **Coordinates:** Central Campus (The Oval) `[-83.0125, 40.0000]`
* **View:** 3D Perspective (Pitch: 50°, Bearing: -20°)
* **Style:** `mapbox://styles/mapbox/dark-v11` (Dark mode makes "Heat" colors pop better).

## 5. Functional Requirements for Antigravity

### A. High-Precision Trilateration Layer
* Implement a Deck.gl `ScatterplotLayer` for individual devices.
* **Movement**: Dynamic transitions (600ms) for smooth interpolation between signals.
* **Glow**: Subtle halo effect behind nodes for premium visibility.
* **Fade**: nodes older than 60 seconds relative to the current timelapse offset fade to 0 alpha.

### B. Microsecond Timelapse
* **Precision**: Uses `arrival_time_us` for accurate historical ordering.
* **Playback**: 1:1 real-time simulation with pause/scrub functionality.
* **Filtering**: Server-side `packet_id` substring matching with auto-colon-stripping.

### C. Live Dashboard UI
* **Side Panel**: Detailed building stats, capacity gauges, and historical playback controls.
* **Integrated Timeline**: Play/Pause and range slider embedded within the building info view.
* **3D Tooltip**: Building name, current occupancy, and high-precision device counts.

## 6. Development Steps
1.  **Map Initialization:** Set up the DeckGL and Map components within `Map.jsx`.
2.  **Building Filter:** Isolate OSU-specific buildings using their `name` or `osm_id` properties.
3.  **Data State:** Create a React state `buildingData` that acts as the "Source of Truth" for the map colors.
4.  **Extrusion Pulse:** (Bonus) If a building hits 100% capacity, animate the `fill-extrusion-height` to pulse slightly.

## 7. Security & Privacy Disclaimer (For Judge/Presentation)
* Ensure the UI mentions that the project tracks **Device IDs**, not **Person IDs**, and that MAC addresses are truncated/hashed to prevent individual tracking.