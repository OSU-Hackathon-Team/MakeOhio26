# Buckeye-Sense: OSU Device Density Explorer

Buckeye-Sense is a high-precision 3D visualization dashboard designed for OSU's campus. It maps real-time human density and individual device movements using Wi-Fi probe requests captured by Arduino/ESP32 sensor nodes.

![Project Preview](https://via.placeholder.com/800x450?text=Buckeye-Sense+Dashboard+Preview)

## 🚀 Key Features

### 📍 High-Precision Trilateration
- **Real-time Tracking**: Visualizes individual device locations as "Cyan Dots" on a dark, high-contrast map.
- **Smooth Dynamics**: Uses Deck.gl transitions for fluid movement and fading effects.
- **Glow Aesthetics**: Sub-pixel glow layers ensure devices are visible and distinct against building extrusions.

### ⏳ Microsecond Timelapse
- **Historical Playback**: Navigate through time using the `arrival_time_us` (microsecond) database precision.
- **1:1 Playback**: A synchronized ticker allows you to watch historical movements at real speed.
- **One-Minute Fade**: Devices elegantly fade out as they age past a 60-second window, highlighting recent flow.

### 🔍 Advanced Filtering
- **Packet ID Search**: Deep-search the database for specific MAC addresses embedded in the `packet_id`.
- **Live Filtering**: Substring matching happens instantly in the UI while debouncing server-side requests for a snappy experience.
- **Auto-Sanitization**: Enter MACs in any format (e.g., `B0:B8:...`); the system handles the colon stripping automatically.

### 🏗️ Database-Level Isolation
- **Smart Triggers**: Optional server-side triggers allow you to isolate logging to a single specific MAC address for targeted debugging/tracking.
- **Dynamic Controls**: Use Supabase RPCs like `set_focused_mac()` to toggle isolation without changing code.

## 🛠️ Technical Stack

- **Frontend**: React (Vite), Deck.gl, MapLibre GL JS, Tailwind CSS.
- **Backend/DB**: Supabase (PostgreSQL + PostGIS, Real-time Channels).
- **Hardware**: ESP32 sensors sniffing 802.11 Probe Requests and posting via REST/Socket.

## 🏁 Getting Started

### Prerequisites
- Node.js & npm
- [MapTiler](https://www.maptiler.com/) API Key (for beautiful dark-v11 map styles)
- Supabase Project URL & Anon Key

### Installation

1. **Clone and Install**
   ```bash
   npm install
   ```

2. **Environment Setup**
   Create a `.env` file in the root:
   ```env
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_MAPTILER_API_KEY=your_maptiler_key
   ```

3. **Database Setup**
   Run the SQL scripts in the `/supabase` directory within your Supabase SQL Editor to set up:
   - `setup.sql`: Core tables and PostGIS geoms.
   - `mac_isolation.sql`: Advanced filtering triggers and RPCs.

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## 📂 Project Structure

- `/src/components`: Core UI including `Map.jsx` and `BuildingInfoPanel.jsx`.
- `/src/utils`: Trilateration logic and coordinate transformations.
- `/supabase`: SQL migration scripts and instructions.
- `/scripts`: Utility scripts for data fetching and cleanup.

---
*Created for MakeOhio 2026. Go Buckeyes!* 🌰
