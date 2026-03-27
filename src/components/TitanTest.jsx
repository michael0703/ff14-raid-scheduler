import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, RefreshCw, Layers, Zap } from 'lucide-react';

const TitanTest = () => {
  const [titanAngle, setTitanAngle] = useState(0);
  const [fanAngle, setFanAngle] = useState(45);
  const [activeHit, setActiveHit] = useState(0); // 0: None, 1: Hit 1, 2: Hit 2, 3: Both
  const [showTelegraph, setShowTelegraph] = useState(true);

  const hit1Offsets = [0, fanAngle, -fanAngle];
  const hit2Offsets = [fanAngle / 2, -fanAngle / 2];

  const getCoords = (angle, radius = 40) => {
    const radian = (angle - 90) * (Math.PI / 180);
    const x = 50 + radius * Math.cos(radian);
    const y = 50 + radius * Math.sin(radian);
    return { x, y };
  };

  const titanPos = getCoords(titanAngle, 45);

  return (
    <div className="flex-1 flex flex-col items-center p-8 bg-slate-950 min-h-screen text-slate-200">
      <div className="w-full max-w-4xl flex items-center justify-between mb-8">
        <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white">
          <ChevronLeft size={20} />
          <span className="font-bold">返回首頁</span>
        </Link>
        <h1 className="text-2xl font-black text-orange-500">TITAN LANDSLIDE DEBUG</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 items-start w-full max-w-6xl">
        {/* Arena Visualization */}
        <div className="relative w-full aspect-square max-w-[60vh] bg-slate-900 rounded-full border-4 border-slate-800 shadow-2xl flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 100 100" className="w-full h-full p-0 pointer-events-none overflow-visible">
            {/* Guidelines */}
            <circle cx="50" cy="50" r="48" fill="none" stroke="#1e293b" strokeWidth="0.5" />
            <line x1="50" y1="2" x2="50" y2="98" stroke="#1e293b" strokeWidth="0.2" />
            <line x1="2" y1="50" x2="98" y2="50" stroke="#1e293b" strokeWidth="0.2" />
            
            {/* Landslides */}
            {(activeHit === 1 || activeHit === 3) && hit1Offsets.map(offset => (
              <rect 
                key={`h1-${offset}`}
                x={titanPos.x - 6} y={titanPos.y} width={12} height={150} 
                fill={showTelegraph ? "rgba(234, 179, 8, 0.2)" : "rgba(234, 179, 8, 0.6)"}
                stroke="rgba(234, 179, 8, 0.8)" strokeWidth="0.2"
                transform={`rotate(${titanAngle + offset}, ${titanPos.x}, ${titanPos.y})`}
              />
            ))}
            
            {(activeHit === 2 || activeHit === 3) && hit2Offsets.map(offset => (
              <rect 
                key={`h2-${offset}`}
                x={titanPos.x - 6} y={titanPos.y} width={12} height={150} 
                fill={showTelegraph ? "rgba(251, 191, 36, 0.2)" : "rgba(251, 191, 36, 0.6)"}
                stroke="rgba(251, 191, 36, 0.8)" strokeWidth="0.2"
                transform={`rotate(${titanAngle + offset}, ${titanPos.x}, ${titanPos.y})`}
              />
            ))}

            {/* Titan Icon */}
            <circle cx={titanPos.x} cy={titanPos.y} r="4" className="fill-orange-600 shadow-lg" />
            <text x={titanPos.x} y={titanPos.y + 1} textAnchor="middle" fontSize="4" fill="white" fontWeight="bold">T</text>
          </svg>
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col gap-8 bg-slate-900/50 p-8 rounded-3xl border border-slate-800">
          <section>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Titan Orientation</h3>
            <div className="space-y-4">
              <input 
                type="range" min="0" max="360" step="45" 
                value={titanAngle} onChange={(e) => setTitanAngle(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="grid grid-cols-4 gap-2">
                {[0, 90, 180, 270].map(a => (
                  <button 
                    key={a} onClick={() => setTitanAngle(a)}
                    className={`text-[10px] font-bold py-2 rounded-lg border transition-all ${titanAngle === a ? 'bg-orange-500 border-orange-400' : 'border-slate-700 hover:border-slate-500'}`}
                  >
                    {a === 0 ? 'North' : a === 90 ? 'East' : a === 180 ? 'South' : 'West'}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Fan Angle (間隔角度)</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-xs font-bold text-orange-500">
                <span>Narrow</span>
                <span>{fanAngle}°</span>
                <span>Wide</span>
              </div>
              <input 
                type="range" min="15" max="90" step="5" 
                value={fanAngle} onChange={(e) => setFanAngle(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Mechanism Layers</h3>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setActiveHit(1)}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${activeHit === 1 ? 'bg-slate-100 text-slate-950 border-white' : 'border-slate-800 hover:border-slate-600'}`}
              >
                <div className="flex items-center gap-3 font-black uppercase text-sm italic">
                  <Layers size={18} />
                  Hit 1 (0, ±{fanAngle}°)
                </div>
                <span className="text-[10px] opacity-50">3 Lines</span>
              </button>
              <button 
                onClick={() => setActiveHit(2)}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${activeHit === 2 ? 'bg-slate-100 text-slate-950 border-white' : 'border-slate-800 hover:border-slate-600'}`}
              >
                <div className="flex items-center gap-3 font-black uppercase text-sm italic">
                  <Layers size={18} />
                  Hit 2 (±{fanAngle/2}°)
                </div>
                <span className="text-[10px] opacity-50">Gap Fill</span>
              </button>
              <button 
                onClick={() => setActiveHit(3)}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${activeHit === 3 ? 'bg-orange-500 text-white border-orange-400' : 'border-slate-800 hover:border-slate-600'}`}
              >
                <div className="flex items-center gap-3 font-black uppercase text-sm italic">
                  <RefreshCw size={18} />
                  Compare Both
                </div>
              </button>
            </div>
          </section>

          <section className="mt-4 p-4 bg-orange-950/20 rounded-2xl border border-orange-900/30">
            <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Zap size={14} />
              Debug Note
            </h4>
            <p className="text-[10px] leading-relaxed text-slate-400">
              在這個獨立測試頁面中，你可以手動切換 **Hit 1** 與 **Hit 2** 的範圍。
              請確認地裂角度是否與實戰圖片相符。目前的設定：
              <br/>- **第一波**: 0度 (朝中心), 正負 45度
              <br/>- **第二波**: 正負 22.5度 (剛好在第一波的夾角)
            </p>
          </section>
        </div>
      </div>

      <div className="mt-auto py-8 text-[8px] font-black uppercase tracking-[0.5em] opacity-30">
        Primal Logic Debug Tool v1.0
      </div>
    </div>
  );
};

export default TitanTest;
