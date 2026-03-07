import React, { useState, useMemo, useEffect } from 'react'
import DeckGL from '@deck.gl/react'
import { Map } from 'react-map-gl/maplibre'
import { GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers'
import 'maplibre-gl/dist/maplibre-gl.css'
import buildingsData from '../data/buildings.json'
import { supabase } from '../lib/supabase'
import AdminPanel from './AdminPanel'

// OSU North Campus Coordinates
import { LinearInterpolator } from '@deck.gl/core'

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

    // Initial Fetch & Real-time Subscription
    useEffect(() => {
        const fetchData = async () => {
            const { data: bData } = await supabase.from('buildings').select('*')
            if (bData) {
                const updatedFeatures = buildingsData.features.map(feature => {
                    const building = bData.find(b => b.id === feature.properties.id)
                    return {
                        ...feature,
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

    // Get API key from env
    const mapTilerKey = import.meta.env.VITE_MAPTILER_API_KEY
    const hasValidKey = mapTilerKey && mapTilerKey !== 'your_maptiler_key_here' && mapTilerKey !== 'get_your_free_key_at_maptiler'

    const styleUrl = hasValidKey
        ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${mapTilerKey}`
        : null

    const layers = useMemo(() => {
        const activeLayers = [
            new GeoJsonLayer({
                id: 'building-extrusion',
                data: buildings,
                pickable: true,
                extruded: true,
                getFillColor: d => [...(d.properties.color || [150, 150, 150]), 180],
                getElevation: d => d.properties.height || 20,
                transitions: { getFillColor: 600, getElevation: 600 }
            })
        ];

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
                    getLineWidth: 2,
                    getLineColor: [255, 255, 255],
                    updateTriggers: { getRadius: [draggedBoardId] }
                })
            );
        }

        return activeLayers;
    }, [buildings, boards, draggedBoardId])

    const handleDragStart = (info) => {
        if (info.object && info.layer.id === 'board-locations') {
            setDraggedBoardId(info.object.id);
            return false; // Prevent map panning
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
    };

    const handleDragEnd = (info) => {
        if (draggedBoardId && info.coordinate) {
            const [lng, lat] = info.coordinate;
            updateBoardCoords(draggedBoardId, lat, lng);
            setDraggedBoardId(null);
        }
    };

    return (
        <div className="w-full h-full relative bg-neutral-950">
            <DeckGL
                key="main-deck-gl"
                viewState={viewState}
                onViewStateChange={({ viewState }) => setViewState(viewState)}
                controller={draggedBoardId ? false : true}
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
            />

            {(!hasValidKey || apiKeyError) && (
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
            )}

            {/* Legend - Only show if no error */}
            {!apiKeyError && hasValidKey && (
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
            )}
        </div>
    )
}

export default MapComponent
