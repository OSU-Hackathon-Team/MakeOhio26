import json

json_path = r'c:\Users\pohfe\OneDrive - The Ohio State University\Desktop\Coding Projects\MakeOhio26\src\data\buildings.json'
sql_path = r'c:\Users\pohfe\OneDrive - The Ohio State University\Desktop\Coding Projects\MakeOhio26\supabase\update_geoms.sql'

with open(json_path, 'r') as f:
    data = json.load(f)

sql_statements = []
sql_statements.append("-- Run this in your Supabase SQL Editor to populate building geometries\n")

for feature in data['features']:
    b_id = feature['properties']['id']
    geom_json = json.dumps(feature['geometry'])
    
    # Create UPDATE statement
    stmt = f"UPDATE buildings SET geom = ST_GeomFromGeoJSON('{geom_json}') WHERE id = '{b_id}';"
    sql_statements.append(stmt)

with open(sql_path, 'w') as f:
    f.write("\n".join(sql_statements))

print(f"SQL generated at {sql_path}")
