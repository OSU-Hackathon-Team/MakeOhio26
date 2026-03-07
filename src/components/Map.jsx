import React, { useState, useMemo, useEffect } from 'react'
import DeckGL from '@deck.gl/react'
import { Map } from 'react-map-gl/maplibre'
import { GeoJsonLayer } from '@deck.gl/layers'
import 'maplibre-gl/dist/maplibre-gl.css'
import buildingsData from '../data/buildings.json'
import { supabase } from '../lib/supabase'

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

    // Helper to get color based on density
    const getColor = (count, capacity) => {
        const ratio = count / capacity
        if (ratio < 0.2) return [34, 197, 94] // green-500
        if (ratio < 0.5) return [234, 179, 8] // yellow-500
        if (ratio < 0.8) return [249, 115, 22] // orange-500
        return [239, 68, 68] // red-500
    }

    // Initial Fetch & Real-time Subscription
    useEffect(() => {
        const fetchInitialCounts = async () => {
            const { data, error } = await supabase
                .from('buildings')
                .select('*')

            if (data && !error) {
                const updatedFeatures = buildingsData.features.map(feature => {
                    const building = data.find(b => b.id === feature.properties.id)
                    if (building) {
                        return {
                            ...feature,
                            properties: {
                                ...feature.properties,
                                current_count: building.current_count,
                                capacity: building.capacity || feature.properties.capacity,
                                color: getColor(building.current_count, building.capacity || feature.properties.capacity)
                            }
                        }
                    }
                    return {
                        ...feature,
                        properties: {
                            ...feature.properties,
                            current_count: 0,
                            color: getColor(0, feature.properties.capacity || 100)
                        }
                    }
                })
                setBuildings({ type: 'FeatureCollection', features: updatedFeatures })
            }
        }

        fetchInitialCounts()

        // Real-time Subscription
        const channel = supabase
            .channel('building_updates')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'buildings' },
                payload => {
                    setBuildings(prev => {
                        const newFeatures = prev.features.map(f => {
                            if (f.properties.id === payload.new.id) {
                                return {
                                    ...f,
                                    properties: {
                                        ...f.properties,
                                        current_count: payload.new.current_count,
                                        color: getColor(payload.new.current_count, payload.new.capacity || f.properties.capacity)
                                    }
                                }
                            }
                            return f
                        })
                        return { ...prev, features: newFeatures }
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    // Get API key from env
    const mapTilerKey = import.meta.env.VITE_MAPTILER_API_KEY
    const hasValidKey = mapTilerKey && mapTilerKey !== 'your_maptiler_key_here' && mapTilerKey !== 'get_your_free_key_at_maptiler'

    const styleUrl = hasValidKey
        ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${mapTilerKey}`
        : null

    const layers = useMemo(() => [
        new GeoJsonLayer({
            id: 'building-extrusion',
            data: buildings,
            pickable: true,
            extruded: true,
            getFillColor: d => [...(d.properties.color || [150, 150, 150]), 180],
            getElevation: d => d.properties.height || 20,
            transitions: {
                getFillColor: 600,
                getElevation: 600
            }
        })
    ], [buildings])

    const onViewStateChange = ({ viewState }) => {
        setViewState(viewState)
    }

    return (
        <div className="w-full h-full relative bg-neutral-950">
            <DeckGL
                initialViewState={viewState}
                onViewStateChange={onViewStateChange}
                controller={true}
                layers={layers}
                getTooltip={({ object }) => object && `Building: ${object.properties.name || 'Unknown'}\nCount: ${object.properties.current_count || 0}`}
            >
                <Map
                    mapStyle={styleUrl}
                    onError={() => setApiKeyError(true)}
                />
            </DeckGL>

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
