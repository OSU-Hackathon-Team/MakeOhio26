import React from 'react';

const BuildingEditorPanel = ({
    isEditingBuildings,
    setIsEditingBuildings,
    selectedBuildingId,
    onSaveGeometry,
    onCancelEdit
}) => {
    return (
        <div className="bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Map Builder</h2>
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase ${isEditingBuildings ? 'text-green-500' : 'text-neutral-600'}`}>
                        {isEditingBuildings ? 'Editing' : 'Locked'}
                    </span>
                    <button
                        onClick={() => {
                            setIsEditingBuildings(!isEditingBuildings);
                            if (isEditingBuildings && onCancelEdit) onCancelEdit();
                        }}
                        className={`w-8 h-4 rounded-full relative transition-colors ${isEditingBuildings ? 'bg-green-500/20' : 'bg-neutral-800'}`}
                    >
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${isEditingBuildings ? 'right-0.5 bg-green-500' : 'left-0.5 bg-neutral-600'}`}></div>
                    </button>
                </div>
            </div>

            {isEditingBuildings && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    {selectedBuildingId ? (
                        <div className="bg-neutral-800/50 p-3 rounded-xl border border-neutral-700">
                            <p className="text-xs text-white mb-2 font-medium">Building Selected</p>
                            <p className="text-[10px] text-neutral-400 mb-3">
                                Drag the white corner nodes to reshape the building footprint.
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={onCancelEdit}
                                    className="py-1.5 px-2 rounded-lg border border-neutral-600 text-[10px] font-bold text-neutral-300 hover:bg-neutral-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={onSaveGeometry}
                                    className="py-1.5 px-2 rounded-lg bg-green-500/20 border border-green-500/50 text-[10px] font-bold text-green-400 hover:bg-green-500/30 transition-colors"
                                >
                                    Save Geometry
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-neutral-800/30 p-4 border border-dashed border-neutral-700 rounded-xl text-center">
                            <p className="text-xs text-neutral-400">Click any building on the map to begin editing its outline.</p>
                        </div>
                    )}
                </div>
            )}

            <p className="mt-4 text-[9px] text-neutral-500 italic block">
                {isEditingBuildings
                    ? "* Click a building to reveal its vertices. Drag vertices to perfectly align the building with satellite imagery."
                    : "* Buildings are locked to prevent accidental edits. Unlock to customize map geography."}
            </p>
        </div>
    );
};

export default BuildingEditorPanel;
