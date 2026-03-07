import requests
import json
import time
import os
from dotenv import load_dotenv

# Load Supabase credentials from .env
load_dotenv()

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in .env")
    exit(1)

# Ensure URL is clean and has protocol
if not SUPABASE_URL.startswith('http'):
    SUPABASE_URL = f"https://{SUPABASE_URL.split(':')[0]}"
else:
    # Remove any database-specific path if accidentally included
    SUPABASE_URL = SUPABASE_URL.split(':5432')[0].rstrip('/')

ENDPOINT = f"{SUPABASE_URL}/rest/v1/packet_reports"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# 1. Generate a unique packet ID
packet_id = f"mock_pkt_{int(time.time())}"
device_hash = "mock_phone_user_001"

# 2. Boards to simulate
boards = ["board_north", "board_south", "board_east"]

print(f"🚀 Simulating triangulation for Packet ID: {packet_id}")

for board in boards:
    payload = {
        "packet_id": packet_id,
        "board_id": board,
        "device_hash": device_hash,
        "arrival_time_us": int(time.time() * 1000000),
        "rssi": -55
    }
    
    response = requests.post(ENDPOINT, headers=headers, json=payload)
    
    if response.status_code in [201, 204]:
        print(f"✅ Report sent from {board}")
    else:
        print(f"❌ Failed to send from {board}: {response.text}")
    
    # Small delay between reports
    time.sleep(0.1)

print("\n✨ Done! If the boards surround a building, it should change color in your web app.")
