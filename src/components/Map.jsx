import React, { useRef, useEffect, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const Map = () => {
    const mapContainer = useRef(null)
    const map = useRef(null)
    const [lng, setLng] = useState(-83.0125)
    const [lat, setLat] = useState(40.0)
    const [zoom] = useState(15.5)
    const [pitch] = useState(50)
    const [bearing] = useState(-20)
    const [apiKeyError, setApiKeyError] = useState(false)

    useEffect(() => {
        if (map.current) return // Initialize map only once

        // Get API key from env
        const mapTilerKey = import.meta.env.VITE_MAPTILER_API_KEY

        if (!mapTilerKey || mapTilerKey === 'your_maptiler_key_here' || mapTilerKey === 'get_your_free_key_at_maptiler') {
            console.error('MapTiler API Key is missing or invalid.')
            setApiKeyError(true)
            return
        }

        const styleUrl = `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${mapTilerKey}`

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: styleUrl,
            center: [lng, lat],
            zoom: zoom,
            pitch: pitch,
            bearing: bearing,
            antialias: true
        })

        map.current.on('load', () => {
            console.log('Map loaded successfully')
            // Add 3D buildings layer
            map.current.addLayer({
                'id': '3d-buildings',
                'source': 'openmaptiles',
                'source-layer': 'building',
                'type': 'fill-extrusion',
                'minzoom': 14,
                'paint': {
                    'fill-extrusion-color': '#333333',
                    'fill-extrusion-height': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        14,
                        0,
                        14.05,
                        ['get', 'render_height']
                    ],
                    'fill-extrusion-base': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        14,
                        0,
                        14.05,
                        ['get', 'render_min_height']
                    ],
                    'fill-extrusion-opacity': 0.8
                }
            })

            map.current.addSource('building-data', {
                'type': 'geojson',
                'data': {
                    'type': 'FeatureCollection',
                    'features': []
                }
            })
        })

        map.current.on('error', (e) => {
            console.error('MapLibre error:', e)
            if (e.error?.status === 403 || e.error?.status === 401) {
                setApiKeyError(true)
            }
        })

        return () => {
            if (map.current) {
                map.current.remove()
                map.current = null
            }
        }
    }, [])

    return (
        <div className="w-full h-full relative bg-neutral-950">
            <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

            {apiKeyError && (
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

            {/* Legend */}
            {!apiKeyError && (
                <div className="absolute bottom-10 left-6 z-10 bg-neutral-900/80 backdrop-blur-md p-4 rounded-xl border border-neutral-800 shadow-xl">
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

export default Map
