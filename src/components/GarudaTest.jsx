import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Wind, CircleDot } from 'lucide-react';

const GarudaTest = () => {
  const [wheelRadius, setWheelRadius] = useState(20);
  const [tornadoInner, setTornadoInner] = useState(15);
  const [tornadoOuter, setTornadoOuter] = useState(60);
  const [activeMechanic, setActiveMechanic] = useState('wheel'); // 'wheel' | 'tornado' | 'both'

  const garudaPos = { x: 50, y: 25 }; // Fixed for testing

  const renderDonutPath = (x, y, rInner, rOuter) => {
    return `M ${x} ${y - rOuter} A ${rOuter} ${rOuter} 0 1 1 ${x} ${y + rOuter} A ${rOuter} ${rOuter} 0 1 1 ${x} ${y - rOuter} Z 
            M ${x} ${y - rInner} A ${rInner} ${rInner} 0 1 0 ${x} ${y + rInner} A ${rInner} ${rInner} 0 1 0 ${x} ${y - rInner} Z`;
  };

  return (
    <div className="flex-1 flex flex-col items-center p-8 bg-slate-950 min-h-screen text-slate-200">
      <div className="w-full max-w-4xl flex items-center justify-between mb-8">
        <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white">
          <ChevronLeft size={20} />
          <span className="font-bold">返回首頁</span>
        </Link>
        <h1 className="text-2xl font-black text-green-500 italic">GARUDA MECHANIC DEBUG</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 items-start w-full max-w-6xl">
        {/* Arena */}
        <div className="relative w-full aspect-square max-w-[60vh] bg-slate-900 rounded-full border-4 border-slate-800 shadow-2xl flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 100 100" className="w-full h-full p-0">
            <circle cx="50" cy="50" r="48" fill="none" stroke="#1e293b" strokeWidth="0.5" />
            
            {/* Wicked Wheel */}
            {(activeMechanic === 'wheel' || activeMechanic === 'both') && (
              <circle cx={garudaPos.x} cy={garudaPos.y} r={wheelRadius} fill="rgba(34, 197, 94, 0.4)" stroke="rgba(34, 197, 94, 0.8)" strokeWidth="0.5" className="animate-pulse" />
            )}

            {/* Wicked Tornado */}
            {(activeMechanic === 'tornado' || activeMechanic === 'both') && (
              <path d={renderDonutPath(garudaPos.x, garudaPos.y, tornadoInner, tornadoOuter)} fill="rgba(34, 197, 94, 0.3)" stroke="rgba(34, 197, 94, 0.6)" strokeWidth="0.5" fillRule="evenodd" />
            )}

            {/* Garuda Position */}
            <circle cx={garudaPos.x} cy={garudaPos.y} r="3" fill="white" />
            <text x={garudaPos.x} y={garudaPos.y - 5} textAnchor="middle" fontSize="3" fill="white" fontWeight="bold">GARUDA</text>
          </svg>
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col gap-8 bg-slate-900/50 p-8 rounded-3xl border border-slate-800">
          <section>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-slate-800 pb-2">Size Controls</h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-green-400">Wicked Wheel Radius (鋼鐵)</span>
                  <span className="text-white">{wheelRadius}u</span>
                </div>
                <input type="range" min="5" max="40" value={wheelRadius} onChange={(e) => setWheelRadius(parseInt(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-green-500" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-emerald-400">Tornado Inner Radius (月環內圈)</span>
                  <span className="text-white">{tornadoInner}u</span>
                </div>
                <input type="range" min="5" max="40" value={tornadoInner} onChange={(e) => setTornadoInner(parseInt(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-emerald-400">Tornado Outer Radius (月環外圈)</span>
                  <span className="text-white">{tornadoOuter}u</span>
                </div>
                <input type="range" min="20" max="100" value={tornadoOuter} onChange={(e) => setTornadoOuter(parseInt(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Toggle View</h3>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setActiveMechanic('wheel')} className={`p-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${activeMechanic === 'wheel' ? 'bg-green-500 border-green-400' : 'border-slate-800'}`}>
                Wheel
              </button>
              <button onClick={() => setActiveMechanic('tornado')} className={`p-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${activeMechanic === 'tornado' ? 'bg-emerald-500 border-emerald-400' : 'border-slate-800'}`}>
                Tornado
              </button>
              <button onClick={() => setActiveMechanic('both')} className={`p-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${activeMechanic === 'both' ? 'bg-slate-100 text-slate-950 border-white' : 'border-slate-800'}`}>
                Both
              </button>
            </div>
          </section>

          <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 text-[10px] text-slate-400 italic">
            💡 在實戰中，「月環」的判定通常緊接在「鋼鐵」之後。請調整大小以確保玩家有足夠的移動空間與視覺提示。
          </div>
        </div>
      </div>
    </div>
  );
};

export default GarudaTest;
