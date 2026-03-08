import React, { useMemo } from 'react';
import { getHardcodedOccupancy } from '../utils/occupancyUtils';

// Simple session-level cache to keep data consistent until refresh
const trafficCache = new Map();

/**
 * Generates a realistic traffic curve for a building.
 * Uses a bell-curve approach centered around 2 PM.
 */
const getSimulatedTraffic = (buildingId, capacity) => {
    if (trafficCache.has(buildingId)) {
        return trafficCache.get(buildingId);
    }

    const data = [];
    // Deterministic seed based on buildingId string
    const seed = buildingId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Pseudo-random function starting from our seed
    const pseudoRandom = (offset) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
    };

    for (let i = 0; i <= 12; i++) {
        const hour = i + 8; // 8 AM to 8 PM

        // Bell curve peak at 2 PM (14:00)
        // Normal distribution: e^(- (x - mean)^2 / (2 * sigma^2))
        const mean = 14;
        const sigma = 3;
        const bellValue = Math.exp(-Math.pow(hour - mean, 2) / (2 * Math.pow(sigma, 2)));

        // Add some "human" randomness (+/- 15%)
        const variability = 0.85 + (pseudoRandom(i) * 0.3);

        // Scale by capacity and variability
        let count = Math.round(capacity * bellValue * variability);

        // Ensure it doesn't exceed capacity or go below a baseline (5%)
        count = Math.max(Math.floor(capacity * 0.05), Math.min(capacity, count));

        data.push({
            hour,
            time: `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'PM' : 'AM'}`,
            count
        });
    }

    trafficCache.set(buildingId, data);
    return data;
};

const BuildingInfoPanel = ({
    building,
    onClose,
    timelapseTime,
    onTimelapseChange,
    isPlaying,
    onTogglePlay,
    timeRange
}) => {
    if (!building) return null;

    const { capacity } = building.properties;
    const buildingCapacity = parseInt(capacity) || 100;
    const buildingId = building.id || building.properties.id || building.properties.name || 'unknown';

    // Use live data ONLY for Fontana
    const isLiveBuilding = buildingId.toLowerCase().includes('fontana');
    const liveCount = isLiveBuilding
        ? (parseInt(building.properties.current_count) || 0)
        : getHardcodedOccupancy(buildingId, buildingCapacity);

    const trafficData = useMemo(() => {
        let baseData = getSimulatedTraffic(buildingId, buildingCapacity);

        // If it's a live building, patch the simulated data point for the current hour 
        // to match the actual database number, ensuring the graph is consistent.
        if (isLiveBuilding) {
            const now = new Date();
            const currentHour = now.getHours();
            return baseData.map(d => d.hour === currentHour ? { ...d, count: liveCount } : d);
        }

        return baseData;
    }, [buildingId, buildingCapacity, isLiveBuilding, liveCount]);

    // Determine "current" count from the data
    const now = new Date();
    const currentHour = now.getHours();

    // Find the closest hour in our data
    const currentDataPoint = trafficData.find(d => d.hour === currentHour) ||
        (currentHour < 8 ? trafficData[0] : trafficData[trafficData.length - 1]);

    const displayCount = isLiveBuilding ? liveCount : (getHardcodedOccupancy(buildingId, buildingCapacity) || currentDataPoint.count);
    const occupancyPercentage = Math.min(100, Math.round((displayCount / buildingCapacity) * 100)) || 0;

    // Timeline Formatting
    const formatTime = (ts) => {
        if (!ts) return '--:--';
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const hasData = timeRange && timeRange.min && timeRange.max;

    return (
        <div className="absolute top-24 right-6 z-10 w-80">
            <div className="bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-right-4">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-white mb-1">{building.properties.name || 'Unknown Building'}</h2>
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${occupancyPercentage > 80 ? 'bg-red-400' : occupancyPercentage > 50 ? 'bg-yellow-400' : 'bg-green-400'}`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${occupancyPercentage > 80 ? 'bg-red-500' : occupancyPercentage > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                            </span>
                            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">Live Occupancy</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-full text-neutral-400 hover:text-white transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Main Stats Card */}
                    <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700/50">
                        <div className="flex justify-between items-end mb-2">
                            <div className="text-3xl font-black text-white tabular-nums tracking-tight">
                                {displayCount.toLocaleString()}
                            </div>
                            <div className="text-sm font-medium text-neutral-500 mb-1">
                                / {buildingCapacity.toLocaleString()} cap
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ease-out ${occupancyPercentage > 80 ? 'bg-red-500' : occupancyPercentage > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                style={{ width: `${occupancyPercentage}%` }}
                            ></div>
                        </div>
                        <div className="mt-2 text-right text-[10px] text-neutral-500 font-bold">
                            {occupancyPercentage}% FULL
                        </div>
                    </div>

                    {/* Historical Graph */}
                    <div>
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2">Today's Traffic</h3>
                        <div className="h-32 w-full pt-2">
                            {(() => {
                                if (trafficData.length === 0) return null;

                                const points = trafficData.map((d, i) => {
                                    const x = (i / (trafficData.length - 1)) * 100;
                                    const y = 100 - (Math.min(100, (d.count / buildingCapacity) * 100));
                                    return `${x},${y}`;
                                }).join(' L ');

                                const areaPath = `M 0,100 L ${points} L 100,100 Z`;
                                const linePath = `M ${points}`;

                                return (
                                    <svg viewBox="0 0 100 100" className="w-full h-full preserve-3d overflow-visible">
                                        <defs>
                                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="rgba(239, 68, 68, 0.4)" />
                                                <stop offset="100%" stopColor="rgba(239, 68, 68, 0.0)" />
                                            </linearGradient>
                                        </defs>

                                        {/* Grid lines */}
                                        <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="2,2" />
                                        <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="2,2" />
                                        <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="2,2" />

                                        {/* Filled Area */}
                                        <path
                                            d={areaPath}
                                            fill="url(#chartGradient)"
                                            className="transition-all duration-1000 ease-out"
                                        />

                                        {/* Line */}
                                        <path
                                            d={linePath}
                                            fill="none"
                                            stroke="#ef4444"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="transition-all duration-1000 ease-out"
                                            style={{ filter: 'drop-shadow(0px 2px 4px rgba(239,68,68,0.5))' }}
                                        />

                                        {/* Data Points */}
                                        {trafficData.map((d, i) => {
                                            const x = (i / (trafficData.length - 1)) * 100;
                                            const y = 100 - (Math.min(100, (d.count / buildingCapacity) * 100));
                                            const isCurrentHour = d.hour === currentHour;

                                            return (
                                                <g key={i}>
                                                    <circle
                                                        cx={x}
                                                        cy={y}
                                                        r={isCurrentHour ? "2.5" : "1.5"}
                                                        fill={isCurrentHour ? "#ef4444" : "#171717"}
                                                        stroke="#ef4444"
                                                        strokeWidth="1"
                                                        className="transition-all duration-1000 ease-out hover:r-[3px] cursor-pointer"
                                                    >
                                                        <title>{d.time}: {d.count} uses</title>
                                                    </circle>
                                                </g>
                                            );
                                        })}
                                    </svg>
                                );
                            })()}
                        </div>

                        {/* X-Axis Labels */}
                        <div className="relative w-full h-8 mt-2">
                            {trafficData.map((d, i) => {
                                const x = (i / (trafficData.length - 1)) * 100;
                                // Only show label every 2 hours to avoid crowding
                                if (i % 2 !== 0) return null;
                                return (
                                    <div
                                        key={i}
                                        className="absolute top-0 transform -translate-x-1/2"
                                        style={{ left: `${x}%` }}
                                    >
                                        <span className="text-[8px] text-neutral-500 font-medium block transform -rotate-45 origin-top-left -ml-2 mt-2">
                                            {d.time}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Timelapse Controls */}
                    <div className="pt-4 border-t border-neutral-800">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Historical Timelapse</h3>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-mono bg-red-500/10 text-red-500 px-2 py-0.5 rounded border border-red-500/20">
                                    {formatTime(timelapseTime)}
                                </span>
                                <button
                                    onClick={onTogglePlay}
                                    disabled={!hasData}
                                    className={`p-1.5 rounded-lg transition-all ${isPlaying ? 'bg-red-500 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'} disabled:opacity-30`}
                                >
                                    {isPlaying ? (
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <input
                                type="range"
                                min={timeRange?.min || 0}
                                max={timeRange?.max || 100}
                                step="1000" // 1 second steps
                                value={timelapseTime || timeRange?.max || 0}
                                onChange={(e) => onTimelapseChange(parseInt(e.target.value))}
                                disabled={!hasData}
                                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-red-500 hover:accent-red-400 transition-all disabled:opacity-30"
                            />
                            <div className="flex justify-between items-center text-[9px] text-neutral-500 font-bold uppercase tracking-tight">
                                <span>{formatTime(timeRange?.min)}</span>
                                <span className="text-red-500/80">1:1 PLAYBACK</span>
                                <span>{formatTime(timeRange?.max)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BuildingInfoPanel;
