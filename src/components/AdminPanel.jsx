import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AdminPanel = ({ boards, onFlyTo, onUpdate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleUpdate = async (id, lat, lon) => {
        setLoading(true);
        await onUpdate(id, lat, lon);
        setLoading(false);
    };

    const handleReset = async () => {
        setLoading(true);
        const defaults = [
            { id: 'board_north', lat: 40.0050, lon: -83.0131 },
            { id: 'board_south', lat: 40.0042, lon: -83.0131 },
            { id: 'board_east', lat: 40.0046, lon: -83.0125 }
        ];

        for (const board of defaults) {
            await onUpdate(board.id, board.lat, board.lon);
        }
        setLoading(false);
    };

    const handleUseMyLocation = (boardId) => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                await onUpdate(boardId, latitude, longitude);
                setLoading(false);
            },
            (error) => {
                console.error("Error getting location:", error);
                alert("Unable to retrieve your location");
                setLoading(false);
            },
            { enableHighAccuracy: true }
        );
    };

    return (
        <div className={`absolute top-6 right-6 z-20 transition-all duration-300 ${isOpen ? 'w-80' : 'w-12'}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-12 h-12 bg-neutral-900 border border-neutral-700 rounded-full flex items-center justify-center text-white shadow-2xl hover:bg-neutral-800 transition-colors"
                title="Board Calibration"
            >
                {isOpen ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                )}
            </button>

            {isOpen && (
                <div className="mt-4 bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-top-4 overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-white uppercase tracking-widest">Board Calibration</h2>
                        <button
                            onClick={handleReset}
                            className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-tighter flex items-center gap-1 transition-colors"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            Reset
                        </button>
                    </div>

                    <div className="space-y-6 relative max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        {loading && (
                            <div className="absolute inset-x-0 top-0 h-1 bg-red-500/20 overflow-hidden">
                                <div className="w-full h-full bg-red-500 animate-progress origin-left"></div>
                            </div>
                        )}
                        {boards.map(board => {
                            const [lon, lat] = board.location?.coordinates || [0, 0];
                            return (
                                <div key={board.id} className="space-y-2 group">
                                    <div className="flex items-center justify-between">
                                        <label
                                            onClick={() => onFlyTo(lon, lat)}
                                            className="text-xs font-medium text-neutral-300 group-hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                                            {board.name}
                                            <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        </label>
                                        <button
                                            onClick={() => handleUseMyLocation(board.id)}
                                            className="p-1.5 bg-neutral-800 hover:bg-red-500/20 text-neutral-500 hover:text-red-500 rounded-lg transition-all"
                                            title="Set to My Location"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-neutral-500 block">Latitude</span>
                                            <input
                                                type="number"
                                                step="0.000001"
                                                defaultValue={lat}
                                                key={`lat-${board.id}-${lat}`}
                                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 transition-colors"
                                                onBlur={(e) => handleUpdate(board.id, e.target.value, lon)}
                                                onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-neutral-500 block">Longitude</span>
                                            <input
                                                type="number"
                                                step="0.000001"
                                                defaultValue={lon}
                                                key={`lon-${board.id}-${lon}`}
                                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 transition-colors"
                                                onBlur={(e) => handleUpdate(board.id, lat, e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <p className="mt-6 text-[10px] text-neutral-500 italic">
                        * Drag nodes on map or click names to fly to location.
                    </p>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
