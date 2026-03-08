import requests
import json
import time
import os
import math
from dotenv import load_dotenv

# Load Supabase credentials from .env
load_dotenv()

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in .env")
    exit(1)

# Ensure URL is clean
if not SUPABASE_URL.startswith('http'):
    SUPABASE_URL = f"https://{SUPABASE_URL.split(':')[0]}"
else:
    SUPABASE_URL = SUPABASE_URL.split(':5432')[0].rstrip('/')

ENDPOINT = f"{SUPABASE_URL}/rest/v1/packet_reports"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# Board Locations (from setup.sql)
BOARDS = {
    "board_north": [-83.0131, 40.0050],
    "board_south": [-83.0131, 40.0042],
    "board_east": [-83.0125, 40.0046]
}

# Target Coords (Concentrated within the board triangle for 3-node coverage)
TARGETS = [
    # Inside the North-South-East triangle
    [-83.0130, 40.0048], [-83.0129, 40.0047], [-83.0128, 40.0046],
    [-83.0130, 40.0044], [-83.0129, 40.0045], [-83.0127, 40.0046],
    [-83.0131, 40.0046], [-83.0126, 40.0048], [-83.0126, 40.0044],
    # Near Fontana Labs (closer to the center)
    [-83.0122, 40.0035], [-83.0120, 40.0034], [-83.0124, 40.0036],
    # Edge cases within reasonable range
    [-83.0135, 40.0046], [-83.0125, 40.0051], [-83.0125, 40.0041],
    [-83.0132, 40.0049], [-83.0132, 40.0043], [-83.0128, 40.0049]
]

def get_distance(p1, p2):
    # Rough approximation: 1 degree approx 111320 meters
    dx = (p1[0] - p2[0]) * 111320 * math.cos(math.radians(p1[1]))
    dy = (p1[1] - p2[1]) * 111320
    return math.sqrt(dx*dx + dy*dy)

def dist_to_rssi(dist):
    # rssi = -59 - 20 * log10(dist)
    if dist < 0.1: dist = 0.1
    return int(-59 - 20 * math.log10(dist))

print(f"🚀 Populating {len(TARGETS)} devices with 3-node triangulation data...")

for i, target in enumerate(TARGETS):
    packet_id = f"sim_pkt_{int(time.time())}_{i}"
    device_hash = f"SIM_DEV_{i:03d}"
    
    reports = []
    for board_id, board_pos in BOARDS.items():
        dist = get_distance(target, board_pos)
        rssi = dist_to_rssi(dist)
        
        # More lenient for simulation: -110 threshold
        if rssi < -110: continue
        
        reports.append({
            "packet_id": packet_id,
            "board_id": board_id,
            "device_hash": device_hash,
            "arrival_time_us": int(time.time() * 1000000),
            "rssi": rssi
        })
    
    if len(reports) >= 3:
        response = requests.post(ENDPOINT, headers=headers, json=reports)
        if response.status_code in [201, 204]:
            print(f"✅ Generated high-precision point for {device_hash} near {target}")
        else:
            print(f"❌ Failed for {device_hash}: {response.text}")
    else:
        print(f"⚠️ Skipping {device_hash} (only {len(reports)} nodes in range)")
    
    # Tiny delay to prevent rate skipping in trigger
    time.sleep(0.05)

print("\n✨ Sync complete! New dots should appear as Cyan on the map.")
