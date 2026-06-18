import React from 'react';

const MedicalBodyMap = ({ fitnessRecords = [] }) => {
  // Find the most recent active injury
  const activeInjury = fitnessRecords.find(
    (record) => record.injury_status && record.injury_status !== 'fit'
  );

  const isInjured = (part) => {
    if (!activeInjury || !activeInjury.injury_type) return false;
    return activeInjury.injury_type.toLowerCase().includes(part.toLowerCase());
  };

  const getStatusColor = () => {
    if (!activeInjury) return '#e5e7eb'; // default gray
    switch (activeInjury.injury_status) {
      case 'severe': return '#ef4444'; // red
      case 'moderate': return '#f97316'; // orange
      case 'minor': return '#eab308'; // yellow
      case 'recovering': return '#3b82f6'; // blue
      default: return '#e5e7eb';
    }
  };

  const activeColor = getStatusColor();

  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 w-full text-left">Medical & Injury Map</h3>
      
      {activeInjury ? (
        <div className="mb-4 w-full p-3 bg-red-50 rounded-lg border border-red-100">
          <p className="text-sm font-semibold text-red-800 uppercase tracking-wider mb-1">Active Injury</p>
          <p className="text-gray-900 font-medium capitalize">{activeInjury.injury_type}</p>
          <p className="text-sm text-gray-600">Status: <span className="font-medium capitalize">{activeInjury.injury_status}</span></p>
        </div>
      ) : (
        <div className="mb-4 w-full p-3 bg-green-50 rounded-lg border border-green-100">
          <p className="text-sm font-semibold text-green-800 uppercase tracking-wider mb-1">Status</p>
          <p className="text-green-900 font-medium">Fully Fit</p>
        </div>
      )}

      {/* Very simplified SVG Body map */}
      <svg width="150" height="300" viewBox="0 0 100 200" className="opacity-90">
        {/* Head */}
        <circle cx="50" cy="20" r="15" fill={isInjured('head') ? activeColor : '#e5e7eb'} stroke="#d1d5db" strokeWidth="2" />
        
        {/* Torso */}
        <rect x="35" y="40" width="30" height="55" rx="10" fill={isInjured('torso') || isInjured('back') || isInjured('chest') ? activeColor : '#e5e7eb'} stroke="#d1d5db" strokeWidth="2" />
        
        {/* Left Arm */}
        <rect x="15" y="45" width="15" height="40" rx="7" transform="rotate(15 20 45)" fill={isInjured('arm') || isInjured('shoulder') || isInjured('wrist') ? activeColor : '#e5e7eb'} stroke="#d1d5db" strokeWidth="2" />
        
        {/* Right Arm */}
        <rect x="70" y="45" width="15" height="40" rx="7" transform="rotate(-15 80 45)" fill={isInjured('arm') || isInjured('shoulder') || isInjured('wrist') ? activeColor : '#e5e7eb'} stroke="#d1d5db" strokeWidth="2" />
        
        {/* Left Leg (Thigh + Calf) */}
        <rect x="35" y="100" width="12" height="40" rx="6" fill={isInjured('leg') || isInjured('hamstring') || isInjured('thigh') || isInjured('quad') ? activeColor : '#e5e7eb'} stroke="#d1d5db" strokeWidth="2" />
        <rect x="35" y="145" width="12" height="40" rx="6" fill={isInjured('calf') || isInjured('shin') || isInjured('knee') ? activeColor : '#e5e7eb'} stroke="#d1d5db" strokeWidth="2" />
        <circle cx="41" cy="142" r="5" fill={isInjured('knee') ? activeColor : '#d1d5db'} />
        <ellipse cx="41" cy="190" rx="8" ry="4" fill={isInjured('ankle') || isInjured('foot') ? activeColor : '#e5e7eb'} stroke="#d1d5db" strokeWidth="2" />

        {/* Right Leg (Thigh + Calf) */}
        <rect x="53" y="100" width="12" height="40" rx="6" fill={isInjured('leg') || isInjured('hamstring') || isInjured('thigh') || isInjured('quad') ? activeColor : '#e5e7eb'} stroke="#d1d5db" strokeWidth="2" />
        <rect x="53" y="145" width="12" height="40" rx="6" fill={isInjured('calf') || isInjured('shin') || isInjured('knee') ? activeColor : '#e5e7eb'} stroke="#d1d5db" strokeWidth="2" />
        <circle cx="59" cy="142" r="5" fill={isInjured('knee') ? activeColor : '#d1d5db'} />
        <ellipse cx="59" cy="190" rx="8" ry="4" fill={isInjured('ankle') || isInjured('foot') ? activeColor : '#e5e7eb'} stroke="#d1d5db" strokeWidth="2" />
      </svg>
    </div>
  );
};

export default MedicalBodyMap;
