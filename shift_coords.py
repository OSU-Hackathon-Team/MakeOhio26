import json
import os

file_path = r'c:\Users\pohfe\OneDrive - The Ohio State University\Desktop\Coding Projects\MakeOhio26\src\data\buildings.json'
shift = -0.0006

with open(file_path, 'r') as f:
    data = json.load(f)

for feature in data['features']:
    coords = feature['geometry']['coordinates']
    # Polygon coordinates are nested: [[[lon, lat], [lon, lat], ...]]
    for ring in coords:
        for point in ring:
            point[0] += shift

with open(file_path, 'w') as f:
    json.dump(data, f, indent=4)
