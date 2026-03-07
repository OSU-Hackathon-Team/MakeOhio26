import json
import math

file_path = r'c:\Users\pohfe\OneDrive - The Ohio State University\Desktop\Coding Projects\MakeOhio26\src\data\buildings.json'
# We previously applied -9 degrees. To get to exactly 90 degrees total from the start,
# we need to rotate by an additional 99 degrees.
angle_rad = math.radians(99) 

with open(file_path, 'r') as f:
    data = json.load(f)

for feature in data['features']:
    coords = feature['geometry']['coordinates'][0] # Outer ring
    
    # 1. Calculate centroid
    lons = [p[0] for p in coords[:-1]]
    lats = [p[1] for p in coords[:-1]]
    cx = sum(lons) / len(lons)
    cy = sum(lats) / len(lats)
    
    # 2. Rotate each point around centroid
    new_coords = []
    for x, y in coords:
        # Translate to origin
        tx, ty = x - cx, y - cy
        # Rotate
        rx = tx * math.cos(angle_rad) - ty * math.sin(angle_rad)
        ry = tx * math.sin(angle_rad) + ty * math.cos(angle_rad)
        # Translate back
        new_coords.append([cx + rx, cy + ry])
    
    feature['geometry']['coordinates'][0] = new_coords

with open(file_path, 'w') as f:
    json.dump(data, f, indent=4)
