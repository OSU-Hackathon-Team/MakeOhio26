-- Function to fetch all buildings with their geometry parsed as GeoJSON
CREATE OR REPLACE FUNCTION public.get_buildings_geojson()
RETURNS TABLE(
    id TEXT, 
    name TEXT, 
    capacity INTEGER, 
    current_count INTEGER, 
    last_updated TIMESTAMP WITH TIME ZONE, 
    geometry JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id, 
        b.name, 
        b.capacity, 
        b.current_count, 
        b.last_updated, 
        ST_AsGeoJSON(b.geom)::jsonb as geometry
    FROM public.buildings b;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_buildings_geojson() TO anon;
GRANT EXECUTE ON FUNCTION public.get_buildings_geojson() TO authenticated;
