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
- [ ] Create a Supabase Edge Function or use the PostgREST API so the Arduino can send logs.
- [ ] Implement the "Deduplication" logic: Only count a `device_hash` once per 5-minute window per building.