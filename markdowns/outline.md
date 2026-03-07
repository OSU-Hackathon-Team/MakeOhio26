# Project: OSU 3D Real-Time Device Density Explorer

## 1. Objective
Build a 3D visualization dashboard that maps real-time device density across OSU campus buildings. The system uses Arduino-based Wi-Fi sniffers to capture MAC addresses and signal strengths (RSSI), calculates "Human Presence" metrics, and renders them onto a 3D building map.

## 2. Technical Context
* **Hardware Source:** Arduino/ESP32 sniffing 802.11 Probe Requests.
* **Data Logic:** Filtering MAC addresses for randomization and using RSSI to determine if a device is "In-Building" or "Nearby."
* **Visualization Goal:** Color-code building extrusions based on live device counts relative to known room capacities.

## 3. Tech Stack
* **Framework:** React (Vite)
* **3D Engine:** Mapbox GL JS (v3+)
* **Styling:** Tailwind CSS
* **Communication:** WebSockets (Socket.io) or Polling for "Live" updates.

## 4. Map Configuration
* **Coordinates:** Central Campus (The Oval) `[-83.0125, 40.0000]`
* **View:** 3D Perspective (Pitch: 50°, Bearing: -20°)
* **Style:** `mapbox://styles/mapbox/dark-v11` (Dark mode makes "Heat" colors pop better).

## 5. Functional Requirements for Antigravity

### A. The "Device Heat" Layer
* Implement a MapLibre `fill-extrusion` layer.
* **Logic:** The `fill-extrusion-color` should be a "data-driven property."
* **Mapping:** * `0-5 devices`: Green (Empty/Quiet)
    * `6-20 devices`: Yellow (Moderate)
    * `21-50 devices`: Orange (Busy)
    * `50+ devices`: Red (At Capacity)

### B. Linux/MAC Address Data Processing
* The frontend needs a handler for incoming JSON payloads from the server:
    ```json
    { "building_id": "scott_house", "device_count": 42, "last_updated": "14:02:01" }
    ```
* Implement a `useEffect` that updates the MapLibre source data whenever a new device count is received.

### C. Live Dashboard UI
* **Header:** Real-time counter of "Total Devices Detected across Campus."
* **3D Tooltip:** When hovering over a building, show:
    * Building Name
    * Current Device Count
    * Privacy Note: "Data anonymized via MAC hashing."

## 6. Development Steps
1.  **Map Initialization:** Set up the MapLibre instance within a React `useRef`.
2.  **Building Filter:** Isolate OSU-specific buildings using their `name` or `osm_id` properties.
3.  **Data State:** Create a React state `buildingData` that acts as the "Source of Truth" for the map colors.
4.  **Extrusion Pulse:** (Bonus) If a building hits 100% capacity, animate the `fill-extrusion-height` to pulse slightly.

## 7. Security & Privacy Disclaimer (For Judge/Presentation)
* Ensure the UI mentions that the project tracks **Device IDs**, not **Person IDs**, and that MAC addresses are truncated/hashed to prevent individual tracking.