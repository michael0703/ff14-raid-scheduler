import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Play, RefreshCw, Flame } from 'lucide-react';

const directions = [
  { name: 'N', angle: 0 },
  { name: 'NE', angle: 45 },
  { name: 'E', angle: 90 },
  { name: 'SE', angle: 135 },
  { name: 'S', angle: 180 },
  { name: 'SW', angle: 225 },
  { name: 'W', angle: 270 },
  { name: 'NW', angle: 315 },
];

const IfritSim = () => {
  const [pillars, setPillars] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const startSimulation = () => {
    setIsSimulating(true);
    // 隨機選擇一個起始方位 (0-7)
    const startIndex = Math.floor(Math.random() * 8);
    
    // 根據規則生成梯形點位
    // N1, N2 是頂邊 (45度)
    // N1-N3 是左邊 (90度)
    // N2-N4 是右邊 (90度)
    const n1 = startIndex;
    const n2 = (startIndex + 1) % 8;
    const n3 = (startIndex - 2 + 8) % 8;
    const n4 = (startIndex + 3) % 8;
    
    setPillars([n1, n2, n3, n4]);
  };

  const resetSimulation = () => {
    setPillars([]);
    setIsSimulating(false);
  };

  const getCoordinates = (angle, radius = 40) => {
    const radian = (angle - 90) * (Math.PI / 180);
    const x = 50 + radius * Math.cos(radian);
    const y = 50 + radius * Math.sin(radian);
    return { x, y };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-4 selection:bg-orange-500/30">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-8">
        <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
          <div className="bg-slate-800 p-2 rounded-lg group-hover:bg-slate-700 transition-colors">
            <ChevronLeft size={20} />
          </div>
          <span className="font-bold">返回首頁</span>
        </Link>
        <div className="flex flex-col items-center">
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent">模擬火神衝練習</h1>
          <div className="h-1 w-24 bg-gradient-to-r from-orange-500 to-red-600 rounded-full mt-1 blur-[1px]"></div>
        </div>
        <div className="w-24 md:flex hidden"></div>
      </div>

      {/* Main Simulation Area */}
      <div className="relative w-full aspect-square max-w-[75vh] bg-slate-900 rounded-full border-4 border-slate-800 shadow-[0_0_50px_-12px_rgba(249,115,22,0.3)] overflow-hidden flex items-center justify-center">
        {/* Arena Circle SVG */}
        <svg viewBox="0 0 100 100" className="w-full h-full p-4 pointer-events-none z-0">
          {/* Background Grid Lines */}
          <circle cx="50" cy="50" r="48" fill="none" stroke="#1e293b" strokeWidth="0.5" />
          <line x1="50" y1="2" x2="50" y2="98" stroke="#1e293b" strokeWidth="0.2" />
          <line x1="2" y1="50" x2="98" y2="50" stroke="#1e293b" strokeWidth="0.2" />
          
          {/* Direction Name Labels */}
          {directions.map((dir) => {
            const { x, y } = getCoordinates(dir.angle, 45);
            return (
              <text 
                key={dir.name}
                x={x} 
                y={y} 
                textAnchor="middle" 
                dominantBaseline="middle" 
                className="text-[4px] font-black fill-slate-600 tracking-tighter"
              >
                {dir.name}
              </text>
            );
          })}
        </svg>

        {/* Pillars (Ifrits) Icons */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {pillars.map((index, i) => {
            const { x, y } = getCoordinates(directions[index].angle, 40);
            return (
              <div 
                key={i}
                className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 animate-in zoom-in duration-300"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <div className="relative flex items-center justify-center">
                  {/* Glow Effect */}
                  <div className="absolute inset-0 bg-orange-600 rounded-full blur-md opacity-50 animate-pulse"></div>
                  {/* Pillar Icon */}
                  <div className="relative bg-orange-600 p-2.5 rounded-full shadow-[0_0_15px_rgba(234,88,12,0.6)] text-white border border-orange-400">
                    <Flame size={24} fill="currentColor" />
                  </div>
                </div>
                {/* Pos Label */}
                <div className="mt-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-black text-orange-400 border border-orange-500/30 uppercase">
                  {directions[index].name}
                </div>
              </div>
            );
          })}
        </div>

        {/* Center Image */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
          <img 
            src="https://xivapi.com/i/061000/061411_hr1.png" 
            alt="Ifrit" 
            className="w-1/2 h-1/2 object-contain grayscale"
          />
        </div>
        
        {/* Start Overlay */}
        {!isSimulating && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center z-20 animate-in fade-in duration-500">
            <div className="bg-orange-600/10 p-8 rounded-full mb-8 animate-pulse border border-orange-500/20">
               <Flame size={64} className="text-orange-500" fill="currentColor opacity-20" />
            </div>
            <button
              onClick={startSimulation}
              className="group relative bg-orange-600 hover:bg-orange-500 text-white px-10 py-5 rounded-2xl font-black text-2xl shadow-[0_10px_40px_-10px_rgba(234,88,12,0.5)] flex items-center gap-4 active:scale-95 transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <Play fill="white" size={28} />
              開始練習
            </button>
            <p className="mt-6 text-slate-400 font-medium tracking-wide">點擊按鈕生成火神配置</p>
          </div>
        )}
      </div>

      {/* Controls Container */}
      <div className="mt-10 w-full max-w-md animate-in slide-in-from-bottom duration-500">
        {isSimulating ? (
          <div className="flex flex-col gap-6">
            <div className="flex gap-4">
              <button
                onClick={startSimulation}
                className="flex-grow bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-lg shadow-blue-900/40 active:scale-95 transition-all"
              >
                <RefreshCw size={24} className="animate-spin-once" />
                下一場練習
              </button>
              <button
                onClick={resetSimulation}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-8 py-4 rounded-2xl font-bold active:scale-95 transition-all border border-slate-700"
              >
                結束
              </button>
            </div>
            
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 text-slate-300 text-sm">
              <h3 className="font-black text-orange-400 mb-3 flex items-center gap-2">
                <Flame size={16} fill="currentColor" />
                練習說明
              </h3>
              <ul className="space-y-2 list-disc list-inside text-slate-400 leading-relaxed font-medium">
                <li>觀察四個火神在場地上的分布。</li>
                <li>這四個火神會形成一個 <span className="text-white font-bold underline decoration-orange-500">梯形</span>。</li>
                <li>找出特定的對角位子進行閃避，這是 UWU 火神階段的核心練習。</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-500 font-medium">
             FF14 Ultimate Weapon Ultimate Simulation
          </div>
        )}
      </div>
    </div>
  );
};

export default IfritSim;
