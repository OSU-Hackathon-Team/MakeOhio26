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

                </div>
            </header>

            {/* Map Container */}
            <main className="w-full h-full">
                <Map />
            </main>

            {/* Sidebar Tooltip / Stats */}

        </div>
    )
}

export default App
