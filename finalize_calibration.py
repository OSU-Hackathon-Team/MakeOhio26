import json
file_path = r'c:\Users\pohfe\OneDrive - The Ohio State University\Desktop\Coding Projects\MakeOhio26\src\data\buildings.json'
lon_shift = 0.0011
lat_shift = -0.00025

with open(file_path, 'r') as f:
    data = json.load(f)

for feature in data['features']:
    for ring in feature['geometry']['coordinates']:
        for point in ring:
            point[0] += lon_shift
            point[1] += lat_shift

with open(file_path, 'w') as f:
    json.dump(data, f, indent=4)

print("Shift applied successfully.")
