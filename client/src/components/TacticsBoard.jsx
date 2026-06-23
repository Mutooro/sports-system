import React, { useState, useEffect } from 'react';
import { User, Shield, RotateCcw } from 'lucide-react';

// Formation templates — each is an array of 11 slot descriptors
const FORMATIONS = {
  '4-4-2': [
    { id: 'gk',  label: 'GK', top: '85%', left: '50%' },
    { id: 'lb',  label: 'LB', top: '65%', left: '15%' },
    { id: 'cb1', label: 'CB', top: '70%', left: '35%' },
    { id: 'cb2', label: 'CB', top: '70%', left: '65%' },
    { id: 'rb',  label: 'RB', top: '65%', left: '85%' },
    { id: 'lm',  label: 'LM', top: '40%', left: '15%' },
    { id: 'cm1', label: 'CM', top: '45%', left: '35%' },
    { id: 'cm2', label: 'CM', top: '45%', left: '65%' },
    { id: 'rm',  label: 'RM', top: '40%', left: '85%' },
    { id: 'st1', label: 'ST', top: '15%', left: '35%' },
    { id: 'st2', label: 'ST', top: '15%', left: '65%' },
  ],
  '4-3-3': [
    { id: 'gk',  label: 'GK', top: '85%', left: '50%' },
    { id: 'lb',  label: 'LB', top: '65%', left: '15%' },
    { id: 'cb1', label: 'CB', top: '70%', left: '35%' },
    { id: 'cb2', label: 'CB', top: '70%', left: '65%' },
    { id: 'rb',  label: 'RB', top: '65%', left: '85%' },
    { id: 'cm1', label: 'CM', top: '45%', left: '25%' },
    { id: 'cm2', label: 'CM', top: '45%', left: '50%' },
    { id: 'cm3', label: 'CM', top: '45%', left: '75%' },
    { id: 'lw',  label: 'LW', top: '15%', left: '15%' },
    { id: 'st',  label: 'ST', top: '12%', left: '50%' },
    { id: 'rw',  label: 'RW', top: '15%', left: '85%' },
  ],
  '3-5-2': [
    { id: 'gk',  label: 'GK', top: '85%', left: '50%' },
    { id: 'cb1', label: 'CB', top: '70%', left: '25%' },
    { id: 'cb2', label: 'CB', top: '70%', left: '50%' },
    { id: 'cb3', label: 'CB', top: '70%', left: '75%' },
    { id: 'lm',  label: 'LM', top: '45%', left: '10%' },
    { id: 'cm1', label: 'CM', top: '48%', left: '30%' },
    { id: 'cm2', label: 'CM', top: '48%', left: '50%' },
    { id: 'cm3', label: 'CM', top: '48%', left: '70%' },
    { id: 'rm',  label: 'RM', top: '45%', left: '90%' },
    { id: 'st1', label: 'ST', top: '15%', left: '35%' },
    { id: 'st2', label: 'ST', top: '15%', left: '65%' },
  ],
  '4-2-3-1': [
    { id: 'gk',  label: 'GK',  top: '85%', left: '50%' },
    { id: 'lb',  label: 'LB',  top: '68%', left: '15%' },
    { id: 'cb1', label: 'CB',  top: '72%', left: '35%' },
    { id: 'cb2', label: 'CB',  top: '72%', left: '65%' },
    { id: 'rb',  label: 'RB',  top: '68%', left: '85%' },
    { id: 'dm1', label: 'DM',  top: '53%', left: '35%' },
    { id: 'dm2', label: 'DM',  top: '53%', left: '65%' },
    { id: 'lam', label: 'LAM', top: '33%', left: '20%' },
    { id: 'cam', label: 'CAM', top: '30%', left: '50%' },
    { id: 'ram', label: 'RAM', top: '33%', left: '80%' },
    { id: 'st',  label: 'ST',  top: '12%', left: '50%' },
  ],
};

const DEFAULT_FORMATION = '4-4-2';

const buildSlots = (template, existing = []) => {
  // Map existing playerId assignments by slot id (carry over when switching template)
  const prevMap = Object.fromEntries(existing.map(s => [s.id, s.playerId ?? null]));
  return template.map(slot => ({
    ...slot,
    playerId: prevMap[slot.id] ?? null,
  }));
};

const TacticsBoard = ({ availablePlayers = [], onSave, initialFormation = null }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(DEFAULT_FORMATION);
  const [formation, setFormation] = useState(() =>
    initialFormation?.length
      ? initialFormation                          // restore saved lineup
      : buildSlots(FORMATIONS[DEFAULT_FORMATION]) // fresh board
  );
  const [selectedSlotId, setSelectedSlotId] = useState(null);

  // When a saved formation loads asynchronously (team switch), sync it in
  useEffect(() => {
    if (initialFormation?.length) {
      setFormation(initialFormation);
      setSelectedSlotId(null);
    }
  }, [initialFormation]);

  const switchTemplate = (name) => {
    setSelectedTemplate(name);
    setFormation(prev => buildSlots(FORMATIONS[name], prev));
    setSelectedSlotId(null);
  };

  const handleSlotClick = (id) => setSelectedSlotId(id);

  const assignPlayer = (playerId) => {
    if (!selectedSlotId) return;
    setFormation(prev =>
      prev.map(slot => (slot.id === selectedSlotId ? { ...slot, playerId } : slot))
    );
    setSelectedSlotId(null);
  };

  const removePlayer = (id) => {
    setFormation(prev =>
      prev.map(slot => (slot.id === id ? { ...slot, playerId: null } : slot))
    );
  };

  const handleClearAll = () => {
    setFormation(prev => prev.map(slot => ({ ...slot, playerId: null })));
    setSelectedSlotId(null);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* The Pitch */}
      <div className="flex flex-col gap-3 flex-1">
        {/* Formation template switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-600">Formation:</span>
          {Object.keys(FORMATIONS).map(name => (
            <button
              key={name}
              onClick={() => switchTemplate(name)}
              className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                selectedTemplate === name
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="relative w-full max-w-2xl h-[600px] bg-green-600 rounded-lg border-4 border-white shadow-xl overflow-hidden mx-auto">
          {/* Pitch Lines */}
          <div className="absolute inset-4 border-2 border-white/50" />
          <div className="absolute top-1/2 left-0 w-full border-t-2 border-white/50" />
          <div className="absolute top-1/2 left-1/2 w-32 h-32 -mt-16 -ml-16 border-2 border-white/50 rounded-full" />
          {/* Penalty Areas */}
          <div className="absolute top-4 left-1/2 w-64 h-32 -ml-32 border-2 border-white/50 border-t-0" />
          <div className="absolute bottom-4 left-1/2 w-64 h-32 -ml-32 border-2 border-white/50 border-b-0" />

          {/* Player Slots */}
          {formation.map((slot) => {
            const player = availablePlayers.find(p => p.id === slot.playerId);
            const isSelected = selectedSlotId === slot.id;

            return (
              <div
                key={slot.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer transition-transform hover:scale-110 z-10"
                style={{ top: slot.top, left: slot.left }}
                onClick={() => handleSlotClick(slot.id)}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 
                  ${isSelected
                    ? 'bg-yellow-400 border-yellow-200 animate-pulse'
                    : player
                      ? 'bg-primary-600 border-white text-white'
                      : 'bg-gray-200 border-gray-400 text-gray-500'
                  }`}
                >
                  {player ? <User size={20} /> : <span className="text-xs font-bold">{slot.label}</span>}
                </div>

                {player ? (
                  <div className="mt-1 bg-black/75 text-white text-xs px-2 py-1 rounded truncate max-w-[80px]">
                    {player.user?.last_name || 'Player'}
                  </div>
                ) : (
                  <div className="mt-1 bg-white/75 text-gray-800 text-[10px] px-1 rounded font-semibold uppercase">
                    {slot.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Side Panel */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        <div className="card h-full flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Shield className="text-primary-600" size={20} /> Squad List
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {selectedSlotId
              ? 'Select a player for the highlighted position:'
              : 'Click a position on the pitch to assign a player.'}
          </p>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {availablePlayers.map(player => {
              const isAssigned = formation.some(s => s.playerId === player.id);
              if (isAssigned) return null;

              return (
                <button
                  key={player.id}
                  disabled={!selectedSlotId}
                  onClick={() => assignPlayer(player.id)}
                  className={`w-full text-left p-3 rounded-lg border flex justify-between items-center transition-colors
                    ${selectedSlotId
                      ? 'hover:bg-primary-50 hover:border-primary-300 cursor-pointer border-gray-200'
                      : 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50'
                    }`}
                >
                  <div>
                    <p className="font-semibold text-sm text-gray-900">
                      {player.user?.first_name} {player.user?.last_name}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {player.position} • {player.ratings?.[0]?.overall ?? 'N/A'} OVR
                    </p>
                  </div>
                  {player.fitnessRecords?.some(r => r.injury_status && r.injury_status !== 'fit') && (
                    <span title="Injured" className="text-red-500 text-xs font-bold border border-red-200 bg-red-50 px-1 rounded">INJ</span>
                  )}
                </button>
              );
            })}
            {availablePlayers.every(p => formation.some(s => s.playerId === p.id)) && availablePlayers.length > 0 && (
              <p className="text-xs text-gray-400 text-center py-4">All players assigned ✓</p>
            )}
            {availablePlayers.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">No players in this team yet.</p>
            )}
          </div>

          {selectedSlotId && formation.find(s => s.id === selectedSlotId)?.playerId && (
            <button
              onClick={() => removePlayer(selectedSlotId)}
              className="mt-4 w-full py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors"
            >
              Remove Player from Slot
            </button>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
            <button
              onClick={handleClearAll}
              className="flex-1 py-2 flex items-center justify-center gap-1 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm"
            >
              <RotateCcw size={14} /> Clear All
            </button>
            <button
              onClick={() => onSave?.(formation)}
              className="flex-1 btn-primary"
            >
              Save Formation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TacticsBoard;
