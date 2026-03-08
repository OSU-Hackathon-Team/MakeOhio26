# Iterations: Buckeye-Sense Project Growth

## Level 1: 3D OSU Map
- [x] Render map centered on OSU Oval with Deck.gl 3D buildings.
- [x] Add basic UI with Tailwind.

## Level 2: Supabase Setup
- [x] Initialize Supabase project.
- [x] Create `buildings` table and seed with footprints.
- [x] Connect React app to fetch initial states.

## Level 3: Real-time "Heat"
- [x] Implement real-time building occupancy updates via Supabase Channels.
- [x] Connect real-time payload to Deck.gl 3D extrusions.

## Level 4: The Ingestion API & High Precision
- [x] Create PostgREST API flow for ESP32 logs.
- [x] Implement microsecond precision with `arrival_time_us`.
- [x] Implement server-side MAC filtering and isolation triggers.

## Level 5: Fluid Visualization
- [x] Add Deck.gl transitions (600ms) for smooth node movement.
- [x] Implement high-precision timelapse with 1:1 playback.
- [x] Add premium aesthetics (glow layers, micro-animations).

## Future Iterations
- [ ] **Multi-Building Support**: Expand building footprints to the entire campus using OSM data.
- [ ] **Path Reconstruction**: Implement A* or RRT* on the backend to snap device movements to hallways/doors.
- [ ] **Occupancy Forecasting**: Use LSTM/RNN to predict building density based on historical Wi-Fi traffic.