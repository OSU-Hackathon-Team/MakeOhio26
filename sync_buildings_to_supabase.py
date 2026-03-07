import json
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from .env
load_dotenv()

url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("VITE_SUPABASE_ANON_KEY") # Use Service Role Key if possible for bulk inserts

if not url or "your_supabase" in url:
    print("Error: Please set your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env first.")
    exit(1)

supabase: Client = create_client(url, key)

def sync_buildings():
    # Path to your buildings.json
    json_path = os.path.join("src", "data", "buildings.json")
    
    with open(json_path, "r") as f:
        data = json.load(f)
    
    for feature in data["features"]:
        props = feature["properties"]
        geom = feature["geometry"]
        
        # Convert GeoJSON polygon to PostGIS WKT (Well-Known Text)
        # PostGIS expects: POLYGON((lng lat, lng lat, ...))
        coords = geom["coordinates"][0]
        wkt_coords = ", ".join([f"{c[0]} {c[1]}" for c in coords])
        wkt = f"POLYGON(({wkt_coords}))"
        
        print(f"Syncing {props['name']}...")
        
        # Upsert building record
        # Note: We use a raw SQL approach or a specific RPC if preferred, 
        # but here we use the basic insert with PostGIS geometry string.
        try:
            res = supabase.table("buildings").upsert({
                "id": props["id"],
                "name": props["name"],
                "capacity": props.get("capacity", 100),
                "geom": wkt # Supabase/PostGIS handles WKT strings automatically
            }).execute()
            print(f"Successfully synced {props['name']}")
        except Exception as e:
            print(f"Error syncing {props['name']}: {e}")

if __name__ == "__main__":
    sync_buildings()
