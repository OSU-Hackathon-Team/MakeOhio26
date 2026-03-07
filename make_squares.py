import json

file_path = r'c:\Users\pohfe\OneDrive - The Ohio State University\Desktop\Coding Projects\MakeOhio26\src\data\buildings.json'

# At ~40 degrees latitude, 1 deg lon is ~0.76 of 1 deg lat (cos(40))
# To make a square of roughly 40-50m side:
d_lat = 0.0002  # Half width in latitude (~22m)
d_lon = 0.00026 # Half width in longitude (~22m) adjusted for 40 deg lat

with open(file_path, 'r') as f:
    data = json.load(f)

for feature in data['features']:
    coords = feature['geometry']['coordinates'][0]
    # Calculate centroid
    lons = [p[0] for p in coords[:-1]]
    lats = [p[1] for p in coords[:-1]]
    cx = sum(lons) / len(lons)
    cy = sum(lats) / len(lats)
    
    # Create square
    # Points: TL, TR, BR, BL, TL
    feature['geometry']['coordinates'] = [[
        [cx - d_lon, cy + d_lat],
        [cx + d_lon, cy + d_lat],
        [cx + d_lon, cy - d_lat],
        [cx - d_lon, cy - d_lat],
        [cx - d_lon, cy + d_lat]
    ]]

with open(file_path, 'w') as f:
    json.dump(data, f, indent=4)
