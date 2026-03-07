# Iterations: Frontend & Supabase Sync

## Level 1: 3D OSU Map
- [ ] Render map centered on OSU Oval with Deck.gl 3D buildings.
- [ ] Add basic UI with Tailwind (Sidebar for building stats).

## Level 2: Supabase Setup
- [ ] Initialize Supabase project.
- [ ] Create `buildings` table and seed it with OSU building IDs (Thompson, Scott, etc.).
- [ ] Connect React app to Supabase and fetch initial building states.

## Level 3: Real-time "Heat"
- [ ] Implement `supabase.channel().on('postgres_changes', ...)` in a React `useEffect`.
- [ ] Connect the real-time payload to the Deck.gl `GeoJsonLayer` color/elevation.
- [ ] **Test:** Manually edit a value in the Supabase Dashboard and watch the building change color in the app.

## Level 4: The Ingestion API
- [x] Create a Supabase PostgREST API flow for Arduino logs.
- [x] **New Architecture**: Use PostGIS `calculate_triangulation()` trigger for automatic occupancy updates.
- [ ] Implement the "Deduplication" logic: Use `packet_id` (MAC + Seq) for backend deduplication.

## Level 5: High-Precision Triangulation
- [/] Populate `buildings.geom` with PostGIS polygons.
- [ ] Deploy at least 3 ESP32 nodes.
- [ ] Verify `ST_Contains` logic matches real-world building footprints.