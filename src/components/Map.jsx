import React, { useState, useMemo, useEffect } from 'react'
import DeckGL from '@deck.gl/react'
import { Map } from 'react-map-gl/maplibre'
import { GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers'
import 'maplibre-gl/dist/maplibre-gl.css'
import buildingsData from '../data/buildings.json'
import { supabase } from '../lib/supabase'
import AdminPanel from './AdminPanel'

import { LinearInterpolator } from '@deck.gl/core'
import BuildingEditorPanel from './BuildingEditorPanel'
import BuildingInfoPanel from './BuildingInfoPanel'
import { trilaterate, rssiToDistance } from '../utils/trilateration'
import { isPointInPolygon, getPolygonCenter } from '../utils/geoUtils'
import { getHardcodedOccupancy } from '../utils/occupancyUtils'

// OSU North Campus Coordinates
const INITIAL_VIEW_STATE = {
    longitude: -83.0135,
    latitude: 40.0040,
    zoom: 15.0,
    pitch: 50,
    bearing: -20,
    maxZoom: 20,
    minZoom: 10
}

const MapComponent = () => {
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE)
    const [apiKeyError, setApiKeyError] = useState(false)
    const [buildings, setBuildings] = useState(buildingsData)
    const [boards, setBoards] = useState([])
    const [draggedBoardId, setDraggedBoardId] = useState(null)
    const [clickTarget, setClickTarget] = useState(null) // { x, y, lng, lat }
    const [isEditingBuildings, setIsEditingBuildings] = useState(false)
    const [selectedBuildingId, setSelectedBuildingId] = useState(null)
    const [editingVertices, setEditingVertices] = useState([])
    const [draggedVertexIndex, setDraggedVertexIndex] = useState(null)
    const [orbitControllerEnabled, setOrbitControllerEnabled] = useState(true)
    const [viewedBuilding, setViewedBuilding] = useState(null)
    const [packetReports, setPacketReports] = useState([])
    const [showTriangulation, setShowTriangulation] = useState(true)
    const [timelapseTime, setTimelapseTime] = useState(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [timeRange, setTimeRange] = useState({ min: null, max: null })

    // Helper to get color based on density
    const getColor = (count, capacity) => {
        const ratio = count / capacity
        if (ratio < 0.2) return [34, 197, 94]
        if (ratio < 0.5) return [234, 179, 8]
        if (ratio < 0.8) return [249, 115, 22]
        return [239, 68, 68]
    }

    const handleRightClick = (info) => {
        if (info.coordinate) {
            // Prevent the browser context menu
            if (info.nativeEvent) info.nativeEvent.preventDefault();
            setClickTarget({
                x: info.x,
                y: info.y,
                lng: info.coordinate[0],
                lat: info.coordinate[1]
            });
        }
        return false;
    };

    const teleportBoard = async (boardId) => {
        if (!clickTarget) return;
        setBoards(prev => prev.map(b => b.id === boardId ? {
            ...b,
            location: { ...b.location, coordinates: [clickTarget.lng, clickTarget.lat] }
        } : b));
        await updateBoardCoords(boardId, clickTarget.lat, clickTarget.lng);
        setClickTarget(null);
    };

    const flyTo = (lng, lat) => {
        setViewState(prev => ({
            ...prev,
            longitude: lng,
            latitude: lat,
            zoom: 18.5,
            pitch: 45,
            transitionDuration: 1000,
            transitionInterpolator: new LinearInterpolator()
        }))
    }

    const updateBoardCoords = async (id, lat, lon) => {
        const { error: rpcError } = await supabase.rpc('update_board_location', {
            board_id: id,
            lat: parseFloat(lat),
            lon: parseFloat(lon)
        })

        // Fallback: If RPC 404s (function not found), try direct update
        if (rpcError && (rpcError.code === 'PGRST202' || rpcError.message?.includes('404'))) {
            console.warn('RPC not found, falling back to direct update');
            const { error: updateError } = await supabase
                .from('boards')
                .update({
                    location: `SRID=4326;POINT(${lon} ${lat})`
                })
                .eq('id', id);
            if (updateError) console.error('Update fallback failed:', updateError);
        } else if (rpcError) {
            console.error('Error updating board:', rpcError);
        }
    }

    const updateBuildingGeom = async (buildingId, geometry) => {
        console.log(`[Persistence] Attempting to save geometry for building: ${buildingId}`);
        const { error } = await supabase.rpc('update_building_geom', {
            b_id: buildingId,
            new_geom: geometry
        });
        if (error) {
            console.error('[Persistence] RPC update_building_geom failed:', error);
            // Fallback: If RPC 404s, try direct update
            if (error.code === 'PGRST202' || error.message?.includes('404')) {
                console.warn('[Persistence] RPC not found, trying direct table update...');
                const { error: updateError } = await supabase
                    .from('buildings')
                    .update({ geom: geometry })
                    .eq('id', buildingId);
                if (updateError) {
                    console.error('[Persistence] Direct table update failed:', updateError);
                } else {
                    console.log('[Persistence] Direct table update succeeded.');
                }
            }
        } else {
            console.log('[Persistence] RPC update_building_geom succeeded.');
        }
    };

    const handleBuildingClick = (info) => {
        if (!isEditingBuildings) {
            if (info.object) {
                setViewedBuilding(info.object);

                // Zoom to building center for a more accurate top-down look
                const center = getPolygonCenter(info.object.geometry.coordinates);
                setViewState(prev => ({
                    ...prev,
                    longitude: center[0],
                    latitude: center[1],
                    zoom: 19.5, // Closer zoom to see cyan dots
                    pitch: 0,    // Top-down view
                    bearing: 0,  // North-up
                    transitionDuration: 1000,
                    transitionInterpolator: new LinearInterpolator()
                }));
            }
            return;
        }
        if (info.object) {
            setSelectedBuildingId(info.object.properties.id);
            // GeoJSON Polygon coordinates are typically [[[lng, lat], [lng, lat], ...]]
            const coords = info.object.geometry.coordinates[0];
            setEditingVertices([...coords]);
        } else {
            handleCancelEdit();
        }
    };

    const handleSaveGeometry = () => {
        if (!selectedBuildingId || editingVertices.length === 0) return;

        // Ensure polygon describes a closed loop
        const finalVertices = [...editingVertices];
        const first = finalVertices[0];
        const last = finalVertices[finalVertices.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
            finalVertices.push([...first]);
        }

        const newGeom = {
            type: "Polygon",
            coordinates: [finalVertices]
        };

        updateBuildingGeom(selectedBuildingId, newGeom);

        // Update local state immediately
        setBuildings(prev => ({
            ...prev,
            features: prev.features.map(f =>
                f.properties.id === selectedBuildingId
                    ? { ...f, geometry: newGeom }
                    : f
            )
        }));

        handleCancelEdit();
    };

    const handleCancelEdit = () => {
        setSelectedBuildingId(null);
        setEditingVertices([]);
    };

    // Initial Fetch & Real-time Subscription
    useEffect(() => {
        const fetchData = async () => {
            console.log('[Persistence] Fetching building data from Supabase...');
            // Try fetching with geometry parsed to GeoJSON
            const { data: bData, error } = await supabase.rpc('get_buildings_geojson')
            let finalBuildingData = bData;

            // Fallback if RPC doesn't exist
            if (error && (error.code === 'PGRST202' || error.message?.includes('404'))) {
                console.warn('[Persistence] RPC get_buildings_geojson not found, falling back to direct select');
                const { data: fallbackData } = await supabase.from('buildings').select('*');
                finalBuildingData = fallbackData;
            } else if (error) {
                console.error('[Persistence] RPC get_buildings_geojson failed:', error);
            }

            if (finalBuildingData) {
                const updatedFeatures = buildingsData.features.map(feature => {
                    const building = finalBuildingData.find(b => b.id === feature.properties.id)

                    // Prioritize RPC 'geometry', then direct DB 'geom', then original JSON 'geometry'
                    let buildingGeom = building?.geometry || building?.geom || feature.geometry;

                    // If geom is still a string (due to PostGIS hex fallback), we check if it's usable
                    if (typeof buildingGeom === 'string') {
                        if (buildingGeom.startsWith('0103')) {
                            console.debug(`[Persistence] Building ${feature.properties.id} has PostGIS hex geometry; needs working RPC to display.`);
                            buildingGeom = feature.geometry;
                        } else {
                            try {
                                buildingGeom = JSON.parse(buildingGeom);
                            } catch (e) {
                                buildingGeom = feature.geometry;
                            }
                        }
                    }

                    return {
                        ...feature,
                        geometry: buildingGeom,
                        properties: {
                            ...feature.properties,
                            current_count: building?.current_count || 0,
                            capacity: building?.capacity || feature.properties.capacity,
                            color: getColor(building?.current_count || 0, building?.capacity || feature.properties.capacity || 100)
                        }
                    }
                })
                setBuildings({ type: 'FeatureCollection', features: updatedFeatures })
            }

            const { data: brdData } = await supabase.from('boards').select('*')
            if (brdData) setBoards(brdData)

            // Fetch live packet reports for triangulation
            console.log('[Triangulation] Fetching latest packet reports from Supabase...');
            const { data: reports, error: reportsError } = await supabase
                .from('packet_reports')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1000);

            if (reportsError) {
                console.error('[Triangulation] Error fetching reports:', reportsError);
            } else if (reports && reports.length > 0) {
                setPacketReports(reports);

                // Calculate time range using arrival_time_us (converted to ms for UI)
                const times = reports.map(r => parseInt(r.arrival_time_us) / 1000);
                const min = Math.min(...times);
                const max = Math.max(...times);
                setTimeRange({ min, max });
                if (!timelapseTime) setTimelapseTime(max); // Default to most recent
            }
        }

        fetchData()

        const bldChannel = supabase.channel('building_updates')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'buildings' }, payload => {
                setBuildings(prev => ({
                    ...prev,
                    features: prev.features.map(f => f.properties.id === payload.new.id ? {
                        ...f,
                        properties: { ...f.properties, current_count: payload.new.current_count, color: getColor(payload.new.current_count, payload.new.capacity || f.properties.capacity) }
                    } : f)
                }))
            }).subscribe()

        const brdChannel = supabase.channel('board_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'boards' }, payload => {
                if (payload.eventType === 'UPDATE') {
                    setBoards(prev => prev.map(b => b.id === payload.new.id ? payload.new : b))
                }
            }).subscribe()

        return () => {
            supabase.removeChannel(bldChannel)
            supabase.removeChannel(brdChannel)
        }
    }, [])

    // Timelapse Ticker - Drives the historical playback
    useEffect(() => {
        let interval;
        if (isPlaying && timelapseTime && timeRange.max) {
            interval = setInterval(() => {
                setTimelapseTime(prev => {
                    const next = prev + 1000; // 1 second real-time = 1 second timelapse
                    if (next >= timeRange.max) {
                        setIsPlaying(false);
                        return timeRange.max;
                    }
                    return next;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isPlaying, timeRange.max]);

    // Get API key from env
    const mapTilerKey = import.meta.env.VITE_MAPTILER_API_KEY
    const hasValidKey = mapTilerKey && mapTilerKey !== 'your_maptiler_key_here' && mapTilerKey !== 'get_your_free_key_at_maptiler'

    const styleUrl = hasValidKey
        ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${mapTilerKey}`
        : null

    // Memoized device location calculation
    const deviceLocations = useMemo(() => {
        if (!showTriangulation || packetReports.length === 0 || boards.length < 3 || !timelapseTime) return [];

        const windowSize = 60 * 1000; // 1 minute trailing window for fading
        const startTime = timelapseTime - windowSize;

        // Filter packets within the trailing 1-minute window
        const filteredPackets = packetReports.filter(p => {
            const pTime = parseInt(p.arrival_time_us) / 1000;
            return pTime >= startTime && pTime <= timelapseTime;
        });

        if (filteredPackets.length === 0) return [];

        const locations = [];
        const packetsByDevice = filteredPackets.reduce((acc, p) => {
            const devId = p.device_hash || p.device_id;
            if (!acc[devId]) acc[devId] = [];
            acc[devId].push(p);
            return acc;
        }, {});

        Object.entries(packetsByDevice).forEach(([deviceId, packets]) => {
            const signals = [];
            const usedBoardIds = new Set();
            const sortedPackets = packets.sort((a, b) => b.rssi - a.rssi);

            // Get the latest timestamp for this device in the window for fading
            const latestPacketTime = Math.max(...packets.map(p => parseInt(p.arrival_time_us) / 1000));
            const fadeAlpha = Math.max(0, Math.min(255, ((latestPacketTime - startTime) / windowSize) * 200 + 55));

            for (const p of sortedPackets) {
                const board = boards.find(b => b.id === p.board_id);
                if (board && board.location && !usedBoardIds.has(p.board_id)) {
                    signals.push({
                        pos: board.location.coordinates,
                        dist: rssiToDistance(p.rssi)
                    });
                    usedBoardIds.add(p.board_id);
                }
            }

            if (signals.length >= 3) {
                const triPos = trilaterate(
                    signals[0].pos, signals[1].pos, signals[2].pos,
                    signals[0].dist / 111320,
                    signals[1].dist / 111320,
                    signals[2].dist / 111320
                );
                locations.push({
                    id: deviceId,
                    position: triPos,
                    type: 'trilateral',
                    alpha: fadeAlpha
                });
            }
        });
        return locations;
    }, [packetReports, boards, showTriangulation, timelapseTime]);

    // Persist triangulated positions to Supabase
    useEffect(() => {
        if (deviceLocations.length === 0) return;

        const persistLocations = async () => {
            console.log(`[Triangulation] Syncing ${deviceLocations.length} positions to Supabase...`);

            // Prepare upsert payload
            // We only upsert the original device IDs (skipping candidate suffixes for simplicity in the DB)
            // or we could structure the table to handle candidates. For now, let's keep it simple.
            const upsertData = deviceLocations
                .filter(d => !d.isCandidate || d.id.endsWith('_0')) // Only pick one candidate if multiple exist for a 2-node match
                .map(d => ({
                    device_hash: d.origId || d.id,
                    location: `POINT(${d.position[0]} ${d.position[1]})`,
                    last_seen: new Date().toISOString()
                }));

            const { error } = await supabase
                .from('triangulated_devices')
                .upsert(upsertData, { onConflict: 'device_hash' });

            if (error) console.error('[Triangulation] Error persisting locations:', error);
            else console.log('[Triangulation] Successfully persisted locations.');
        };

        const timeout = setTimeout(persistLocations, 2000); // Debounce to allow page to settle
        return () => clearTimeout(timeout);
    }, [deviceLocations]);

    const layers = useMemo(() => {
        const activeLayers = [];

        // Apply global hardcoded occupancy for all buildings except Fontana
        const buildingsWithHardcode = {
            ...buildings,
            features: buildings.features.map(f => {
                const id = f.properties.id;
                const capacity = f.properties.capacity || 100;

                // Keep Fontana live
                if (id.toLowerCase().includes('fontana')) return f;

                const hardCount = getHardcodedOccupancy(id, capacity);
                return {
                    ...f,
                    properties: {
                        ...f.properties,
                        current_count: hardCount,
                        color: getColor(hardCount, capacity)
                    }
                };
            })
        };

        let currentBuildings = buildingsWithHardcode;

        if (showTriangulation && deviceLocations.length > 0) {
            // Calculate Triangulated Occupancy
            const buildingOccupants = {};
            deviceLocations.forEach(device => {
                buildings.features.forEach(feature => {
                    if (isPointInPolygon(device.position, feature.geometry.coordinates)) {
                        buildingOccupants[feature.properties.id] = (buildingOccupants[feature.properties.id] || 0) + 1;
                    }
                });
            });

            // Update building features with triangulated counts (but keep hardcodes)
            const updatedFeatures = buildingsWithHardcode.features.map(f => {
                const id = f.properties.id;
                const triCount = buildingOccupants[id] || 0;

                // Priority: Keep all buildings hardcoded except Fontana
                if (!id.toLowerCase().includes('fontana')) return f;

                return {
                    ...f,
                    properties: {
                        ...f.properties,
                        triangulated_count: triCount,
                        current_count: triCount,
                        color: getColor(triCount, f.properties.capacity || 100)
                    }
                };
            });
            currentBuildings = { ...buildingsWithHardcode, features: updatedFeatures };

            // Add the ScatterplotLayer for triangulated points
            activeLayers.push(
                new ScatterplotLayer({
                    id: 'triangulated-points',
                    data: deviceLocations,
                    getPosition: d => d.position,
                    getFillColor: d => [0, 255, 255, (viewedBuilding ? (d.alpha || 200) : 0)], // Fade based on viewedBuilding & trailing time
                    getRadius: 8,
                    pickable: true,
                    opacity: 1,
                    stroked: true,
                    getLineColor: d => [255, 255, 255, (viewedBuilding ? (d.alpha || 255) : 0)],
                    parameters: { depthTest: false },
                    transitions: {
                        getFillColor: 1000,
                        getLineColor: 1000
                    },
                    updateTriggers: {
                        getFillColor: [!!viewedBuilding, timelapseTime],
                        getLineColor: [!!viewedBuilding, timelapseTime]
                    }
                })
            );
        }


        activeLayers.push(
            new GeoJsonLayer({
                id: 'building-extrusion',
                data: currentBuildings,
                pickable: true,
                extruded: true,
                getFillColor: d => {
                    const baseColor = d.properties.color || [150, 150, 150];
                    if (isEditingBuildings && d.properties.id === selectedBuildingId) {
                        return [239, 68, 68, 180]; // Highlight selected building
                    }
                    return [...baseColor, 180];
                },
                getLineColor: [255, 255, 255, 255],
                getLineWidth: d => (isEditingBuildings && d.properties.id === selectedBuildingId) ? 2 : 0,
                lineWidthMinPixels: 1,
                getElevation: d => d.properties.height || 20,
                transitions: { getFillColor: 600, getElevation: 600 },
                onClick: handleBuildingClick
            })
        );

        if (boards.length > 0) {
            activeLayers.push(
                new ScatterplotLayer({
                    id: 'board-locations',
                    data: boards,
                    getPosition: d => {
                        if (d.location && d.location.coordinates) {
                            return d.location.coordinates;
                        }
                        return [0, 0];
                    },
                    getFillColor: [239, 68, 68],
                    getRadius: draggedBoardId ? 12 : 8,
                    pickable: true,
                    opacity: 0.9,
                    filled: true,
                    stroked: true,
                    getLineColor: [255, 255, 255],
                    parameters: { depthTest: false },
                    updateTriggers: { getRadius: [draggedBoardId] }
                })
            );
        }

        if (isEditingBuildings && editingVertices.length > 0) {
            const vertexData = editingVertices.map((coord, index) => ({
                position: coord,
                index: index
            }));

            activeLayers.push(
                new ScatterplotLayer({
                    id: 'building-vertices',
                    data: vertexData,
                    getPosition: d => d.position,
                    getFillColor: [255, 255, 255],
                    getLineColor: [239, 68, 68],
                    getLineWidth: 2,
                    getRadius: d => draggedVertexIndex === d.index ? 8 : 4,
                    radiusUnits: 'pixels',
                    pickable: true,
                    stroked: true,
                    filled: true,
                    parameters: { depthTest: false },
                    updateTriggers: {
                        getPosition: [editingVertices],
                        getRadius: [draggedVertexIndex]
                    }
                })
            );
        }

        return activeLayers;
    }, [buildings, boards, draggedBoardId, isEditingBuildings, selectedBuildingId, editingVertices, draggedVertexIndex, packetReports, showTriangulation, viewedBuilding, timelapseTime, isPlaying])

    const handleDragStart = (info) => {
        console.log('[Debug] Drag Start Info:', { layerId: info.layer?.id, object: !!info.object, index: info.object?.index });

        if (!isEditingBuildings && info.object && info.layer.id === 'board-locations') {
            setDraggedBoardId(info.object.id);
            setOrbitControllerEnabled(false);
            return false;
        }
        if (isEditingBuildings && info.object && info.layer.id === 'building-vertices') {
            console.log('[Debug] Starting drag for vertex:', info.object.index);
            setDraggedVertexIndex(info.object.index);
            setOrbitControllerEnabled(false);
            return false;
        }
    };

    const handleDrag = (info) => {
        if (draggedBoardId && info.coordinate) {
            const [lng, lat] = info.coordinate;
            setBoards(prev => prev.map(b => b.id === draggedBoardId ? {
                ...b,
                location: { ...b.location, coordinates: [lng, lat] }
            } : b));
        }
        if (draggedVertexIndex !== null && info.coordinate) {
            console.log(`[Debug] Moving vertex ${draggedVertexIndex}:`, info.coordinate);
            setEditingVertices(prev => {
                const newVertices = [...prev];
                newVertices[draggedVertexIndex] = info.coordinate;

                // Sync first and last vertex if they represent the same closed loop point
                if (draggedVertexIndex === 0) newVertices[newVertices.length - 1] = info.coordinate;
                if (draggedVertexIndex === prev.length - 1) newVertices[0] = info.coordinate;

                return newVertices;
            });
        }
    };

    const handleDragEnd = (info) => {
        if (draggedBoardId && info.coordinate) {
            const [lng, lat] = info.coordinate;
            updateBoardCoords(draggedBoardId, lat, lng);
            setDraggedBoardId(null);
            setOrbitControllerEnabled(true);
        }
        if (draggedVertexIndex !== null) {
            console.log(`[Debug] Dropped vertex ${draggedVertexIndex} at:`, info.coordinate);
            setDraggedVertexIndex(null);
            setOrbitControllerEnabled(true);
        }
    };

    return (
        <div className="w-full h-full relative bg-neutral-950">
            <DeckGL
                key="main-deck-gl"
                viewState={viewState}
                onViewStateChange={({ viewState }) => setViewState(viewState)}
                controller={orbitControllerEnabled}
                layers={layers}
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                onContextMenu={handleRightClick}
                getTooltip={({ object }) => {
                    if (!object) return null;
                    if (object.properties) return `Building: ${object.properties.name}\nCount: ${object.properties.current_count}`;
                    return `Board: ${object.name}\n(Drag to move)`;
                }}
            >
                <Map
                    mapStyle={styleUrl}
                    onError={() => setApiKeyError(true)}
                />

                {/* Teleport Selection Menu */}
                {clickTarget && (
                    <div
                        className="absolute z-50 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-xl p-3 shadow-2xl animate-in fade-in zoom-in-95"
                        style={{ left: clickTarget.x, top: clickTarget.y }}
                    >
                        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 px-1">Move Node To Here:</p>
                        <div className="flex flex-col gap-1">
                            {boards.map(board => (
                                <button
                                    key={board.id}
                                    onClick={() => teleportBoard(board.id)}
                                    className="text-xs text-white hover:bg-red-500/20 hover:text-red-400 px-3 py-1.5 rounded-lg text-left transition-all flex items-center gap-2 group"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)] group-hover:scale-125 transition-transform"></div>
                                    {board.name}
                                </button>
                            ))}
                            <button
                                onClick={() => setClickTarget(null)}
                                className="text-[10px] text-neutral-500 hover:text-white px-3 py-1 mt-1 border-t border-neutral-800 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </DeckGL>
            <AdminPanel
                boards={boards}
                onFlyTo={flyTo}
                onUpdate={updateBoardCoords}
            >
                <BuildingEditorPanel
                    isEditingBuildings={isEditingBuildings}
                    setIsEditingBuildings={(val) => {
                        setIsEditingBuildings(val);
                        if (!val) handleCancelEdit();
                    }}
                    selectedBuildingId={selectedBuildingId}
                    onSaveGeometry={handleSaveGeometry}
                    onCancelEdit={handleCancelEdit}
                />
            </AdminPanel>

            <BuildingInfoPanel
                building={viewedBuilding}
                onClose={() => setViewedBuilding(null)}
                timelapseTime={timelapseTime}
                onTimelapseChange={setTimelapseTime}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                timeRange={timeRange}
            />

            {
                (!hasValidKey || apiKeyError) && (
                    <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-sm p-6 text-center">
                        <div className="max-w-md bg-neutral-900 border border-red-500/50 rounded-2xl p-8 shadow-2xl">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">MapTiler Key Required</h3>
                            <p className="text-neutral-400 mb-6">
                                The map requires a valid API key from MapTiler. Please add your key to the <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-red-400">.env</code> file.
                            </p>
                            <a
                                href="https://cloud.maptiler.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-red-500/20"
                            >
                                Get Free API Key
                            </a>
                        </div>
                    </div>
                )
            }

            {/* Legend - Only show if no error */}
            {
                !apiKeyError && hasValidKey && (
                    <div className="absolute bottom-10 left-6 z-10 bg-neutral-900/80 backdrop-blur-md p-4 rounded-xl border border-neutral-800 shadow-xl pointer-events-none">
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Density Legend</h3>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="text-xs text-neutral-300">Empty / Quiet</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <span className="text-xs text-neutral-300">Moderate</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                <span className="text-xs text-neutral-300">Busy</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <span className="text-xs text-neutral-300">At Capacity</span>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}

export default MapComponent
