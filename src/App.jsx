import { useState } from 'react'
import Map from './components/Map'

function App() {
    const [totalDevices, setTotalDevices] = useState(0)

    return (
        <div className="relative w-full h-screen bg-neutral-900 text-white overflow-hidden">
            {/* Header */}
            <header className="absolute top-0 left-0 w-full z-10 p-6 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
                <div className="max-w-7xl mx-auto flex justify-between items-start pointer-events-auto">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-red-500 uppercase italic">Buckeye-Sense</h1>
                        <p className="text-neutral-400 text-sm mt-1">OSU Real-Time Device Density Explorer</p>
                    </div>
                    <div className="bg-neutral-800/80 backdrop-blur-md border border-neutral-700/50 rounded-xl p-4 shadow-2xl">
                        <div className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Total Devices detected</div>
                        <div className="text-4xl font-black text-white tabular-nums">{totalDevices.toLocaleString()}</div>
                    </div>
                </div>
            </header>

            {/* Map Container */}
            <main className="w-full h-full">
                <Map />
            </main>

            {/* Sidebar Tooltip / Stats */}
            <div className="absolute top-32 right-6 z-10 w-80 pointer-events-none">
                <div className="bg-neutral-900/90 backdrop-blur-lg border border-neutral-800 rounded-2xl p-6 shadow-2xl pointer-events-auto">
                    <h2 className="text-xl font-bold mb-4">Building Insights</h2>
                    <div className="space-y-4">
                        <div className="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700/30">
                            <div className="text-xs text-neutral-500 uppercase mb-1">Status</div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-sm font-medium">Monitoring active</span>
                            </div>
                        </div>

                        <p className="text-xs text-neutral-500 leading-relaxed italic">
                            * Privacy Note: Data is anonymized via MAC address hashing before ingestion.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App
