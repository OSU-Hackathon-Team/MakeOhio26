-- Function to update building geometry from GeoJSON
CREATE OR REPLACE FUNCTION public.update_building_geom(b_id TEXT, new_geom JSONB)
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.buildings
    SET geom = ST_GeomFromGeoJSON(new_geom::text)
    WHERE id = b_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_building_geom(TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.update_building_geom(TEXT, JSONB) TO authenticated;
