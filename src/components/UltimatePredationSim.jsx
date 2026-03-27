import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Play, RefreshCw, Wind, Flame, Mountain, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';

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

const GAME_STATE = {
  IDLE: 'IDLE',
  PREPARING: 'PREPARING',
  ACTIVE: 'ACTIVE',
  DONE: 'DONE',
  FAILED: 'FAILED',
};

const UltimatePredationSim = () => {
  const [gameState, setGameState] = useState(GAME_STATE.IDLE);
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 50 });
  const [bosses, setBosses] = useState({
    garuda: { pos: 0, state: 'HIDDEN' },
    ifrit: { pos: 0, state: 'HIDDEN' },
    titan: { pos: 0, state: 'HIDDEN' },
    ultima: { pos: 0, state: 'HIDDEN' },
  });
  const [aoes, setAoes] = useState([]);
  const [timer, setTimer] = useState(0);
  const [showTuning, setShowTuning] = useState(false);

  // Timing Parameters (Relative N, X, A)
  const [startDelay, setStartDelay] = useState(2.0);
  const [mechanicDuration, setMechanicDuration] = useState(12.0);
  const [delayN, setDelayN] = useState(2.0); // Start -> Garuda Wheel
  const [delayX, setDelayX] = useState(2.0); // Garuda Wheel -> Titan/Ultima/Ifrit 1
  const [delayA, setDelayA] = useState(2.0); // First Hit -> Final Hits
  const [titanFanAngle, setTitanFanAngle] = useState(45);
  const [ifritDashWidth, setIfritDashWidth] = useState(25);
  const [ifritCrossWidth, setIfritCrossWidth] = useState(15);
  const [garudaWheelRadius, setGarudaWheelRadius] = useState(20);
  const [garudaTornadoInner, setGarudaTornadoInner] = useState(15);
  const [garudaTornadoOuter, setGarudaTornadoOuter] = useState(60);

  const requestRef = useRef();
  const keysPressed = useRef({});
  const lastTimeRef = useRef();
  const gameTimeRef = useRef(0);

  const startSimulation = () => {
    // Randomize Boss Positions
    // Garuda: Random Intercardinal (45, 135, 225, 315)
    // Ultima: Random Intercardinal (45, 135, 225, 315)
    // Ifrit: Random Intercardinal (45, 135, 225, 315)
    // Titan: Random Cardinal (0, 90, 180, 270)
    
    // Shuffle intercardinals to ensure unique positions for Garuda, Ifrit, Ultima
    const intercardinals = [45, 135, 225, 315].sort(() => Math.random() - 0.5);
    const cardinals = [0, 90, 180, 270];
    
    const gPos = intercardinals[0];
    const uPos = intercardinals[1];
    const iPos = intercardinals[2];
    const tPos = cardinals[Math.floor(Math.random() * 4)];

    setBosses({
      garuda: { angle: gPos, state: 'VISIBLE' },
      ifrit: { angle: iPos, state: 'VISIBLE' },
      titan: { angle: tPos, state: 'VISIBLE' },
      ultima: { angle: uPos, state: 'VISIBLE' },
    });

    setPlayerPos({ x: 50, y: 80 }); // Start at South
    setGameState(GAME_STATE.PREPARING);
    setAoes([]);
    gameTimeRef.current = 0;
  };

  const update = (time) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    if (gameState !== GAME_STATE.IDLE && gameState !== GAME_STATE.FAILED && gameState !== GAME_STATE.DONE) {
      gameTimeRef.current += deltaTime / 1000;
      handleMovement(deltaTime);
      handleLogic();
      checkCollisions();
    }

    requestRef.current = requestAnimationFrame(update);
  };

  const handleMovement = (dt) => {
    const speed = 0.04 * dt; 
    let nextPos = { ...playerPos };
    if (keysPressed.current['w']) nextPos.y -= speed;
    if (keysPressed.current['s']) nextPos.y += speed;
    if (keysPressed.current['a']) nextPos.x -= speed;
    if (keysPressed.current['d']) nextPos.x += speed;

    const dist = Math.sqrt(Math.pow(nextPos.x - 50, 2) + Math.pow(nextPos.y - 50, 2));
    if (dist < 48) {
      setPlayerPos(nextPos);
    }
  };

  const handleLogic = () => {
    const t = gameTimeRef.current;
    const newAoes = [];

    if (gameState === GAME_STATE.PREPARING) {
      setTimer(startDelay - t);
      if (t > startDelay) {
        setGameState(GAME_STATE.ACTIVE);
      }
    }

    if (gameState === GAME_STATE.PREPARING || gameState === GAME_STATE.ACTIVE) {
      const mt = t; // Mechanic Time starts from 0 when bosses appear
      const telegraphWindow = 3.0; // Increased window

      // Helper to add Telegraph and Active states
      const addMechanic = (id, startTime, duration, props) => {
        // Show telegraph up to telegraphWindow seconds before startTime
        if (mt > startTime - telegraphWindow && mt < startTime) {
          newAoes.push({ ...props, id: `${id}-tele`, isTelegraph: true });
        } 
        // Only show Active AOE if we are actually in ACTIVE state
        else if (gameState === GAME_STATE.ACTIVE && mt >= startTime && mt < startTime + duration) {
          newAoes.push({ ...props, id: `${id}-active`, isTelegraph: false });
        }
      };

      const garudaPos = getCoords(bosses.garuda.angle, 15);
      
      const timeN = delayN;
      const timeNX = delayN + delayX;
      const timeNXA = delayN + delayX + delayA;

      // 1. Garuda: Wicked Wheel (N)
      addMechanic('garuda-wheel', timeN, 0.5, { type: 'circle', x: garudaPos.x, y: garudaPos.y, r: garudaWheelRadius, color: 'rgba(34, 197, 94, 0.4)' });

      // 2. Ultima/Titan/Ifrit 1 (N + X)
      addMechanic('ultima-vent', timeNX, 1.0, { type: 'circle', x: getCoords(bosses.ultima.angle, 40).x, y: getCoords(bosses.ultima.angle, 40).y, r: 40, color: 'rgba(168, 85, 247, 0.3)' });
      
      const ifritProps = { type: 'rect', x: 50, y: 50, w: ifritDashWidth, h: 120, angle: bosses.ifrit.angle, color: 'rgba(239, 68, 68, 0.4)' };
      addMechanic('ifrit-dash', timeNX, 0.5, ifritProps);
      
      // 4. Titan: Landslide (Split Pattern)
      const titanPos = getCoords(bosses.titan.angle, 45);
      const titanAngle = bosses.titan.angle;
      const L = 200; 
      
      const getTitanRectBase = (offset) => {
        const ang = titanAngle + offset;
        const rad = (ang - 90) * (Math.PI / 180);
        // Center of rect is TitanPos + Vector(ang+180) * L/2
        const centerX = titanPos.x + (L / 2) * Math.cos(rad + Math.PI);
        const centerY = titanPos.y + (L / 2) * Math.sin(rad + Math.PI);
        return { x: centerX, y: centerY, w: 12, h: L, angle: ang };
      };

      [0, titanFanAngle, -titanFanAngle].forEach(offset => {
        addMechanic(`titan-l1-${offset}`, timeNX, 0.5, { ...getTitanRectBase(offset), type: 'rect', color: 'rgba(234, 179, 8, 0.5)' });
      });

      // 3. Final Hits (N + X + A)
      addMechanic('garuda-tornado', timeNXA, 0.5, { type: 'donut', x: garudaPos.x, y: garudaPos.y, rInner: garudaTornadoInner, rOuter: garudaTornadoOuter, color: 'rgba(34, 197, 94, 0.4)' });

      [0, 90, 180, 270].forEach(angle => {
        addMechanic(`ifrit-cross-${angle}`, timeNXA, 0.5, { type: 'rect', x: 50, y: 50, w: ifritCrossWidth, h: 100, angle: angle, color: 'rgba(239, 68, 68, 0.2)' });
      });

      [titanFanAngle / 2, -titanFanAngle / 2].forEach(offset => {
        addMechanic(`titan-l2-${offset}`, timeNXA, 0.5, { ...getTitanRectBase(offset), type: 'rect', color: 'rgba(234, 179, 8, 0.5)' });
      });

      setAoes(newAoes);

      if (mt > startDelay + mechanicDuration) {
        setGameState(GAME_STATE.DONE);
      }
    }
  };

  const checkCollisions = () => {
    if (aoes.length === 0) return;
    for (const aoe of aoes) {
      if (aoe.isTelegraph) continue; // Skip telegraphs
      if (aoe.type === 'circle') {
        const dist = Math.sqrt(Math.pow(playerPos.x - aoe.x, 2) + Math.pow(playerPos.y - aoe.y, 2));
        if (dist < aoe.r) setGameState(GAME_STATE.FAILED);
      } else if (aoe.type === 'donut') {
        const dist = Math.sqrt(Math.pow(playerPos.x - aoe.x, 2) + Math.pow(playerPos.y - aoe.y, 2));
        if (dist > aoe.rInner && dist < aoe.rOuter) setGameState(GAME_STATE.FAILED);
      } else if (aoe.type === 'rect') {
        const rad = -aoe.angle * (Math.PI / 180);
        const dx = playerPos.x - aoe.x;
        const dy = playerPos.y - aoe.y;
        const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
        if (Math.abs(rx) < aoe.w / 2 && Math.abs(ry) < aoe.h / 2) {
          setGameState(GAME_STATE.FAILED);
        }
      }
    }
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    const handleKeyDown = (e) => { keysPressed.current[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e) => { keysPressed.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, playerPos, bosses]);

  const getCoords = (angle, radius = 40) => {
    const radian = (angle - 90) * (Math.PI / 180);
    const x = 50 + radius * Math.cos(radian);
    const y = 50 + radius * Math.sin(radian);
    return { x, y };
  };

  return (
    <div className="flex-1 flex flex-col items-center p-4 overflow-y-auto w-full bg-slate-950 text-slate-200 min-h-screen">
      <div className="w-full max-w-4xl flex items-center justify-between mb-4">
        <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft size={20} />
          <span className="font-bold">返回首頁</span>
        </Link>
        <div className="flex flex-col items-end">
           <h1 className="text-xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">ULTIMATE PREDATION</h1>
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">絕神兵 一運 模擬器</span>
        </div>
      </div>

      <div className="relative w-full aspect-square max-w-[70vh] bg-slate-900 rounded-full border-4 border-slate-800 shadow-[0_0_100px_-20px_rgba(249,115,22,0.15)] overflow-hidden flex items-center justify-center select-none">
        <svg viewBox="0 0 100 100" className="w-full h-full p-0 pointer-events-none overflow-visible">
          {/* Arena Markings */}
          <circle cx="50" cy="50" r="48" fill="none" stroke="#1e293b" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="#1e293b" strokeWidth="0.2" strokeDasharray="2,2" />
          <line x1="50" y1="2" x2="50" y2="98" stroke="#1e293b" strokeWidth="0.1" />
          <line x1="2" y1="50" x2="98" y2="50" stroke="#1e293b" strokeWidth="0.1" />
          
          {/* AOEs */}
          {aoes.map((aoe) => {
            const currentOpacity = aoe.isTelegraph ? 0.2 : 0.8;
            const currentColor = aoe.color.replace(/0\.\d+\)/, `${currentOpacity})`);

            if (aoe.type === 'circle') return <circle key={aoe.id} cx={aoe.x} cy={aoe.y} r={aoe.r} fill={currentColor} className={aoe.isTelegraph ? "" : "animate-pulse"} />;
            if (aoe.type === 'donut') return (
              <path key={aoe.id} fill={currentColor} fillRule="evenodd" className={aoe.isTelegraph ? "" : "animate-pulse"}
                d={`M ${aoe.x} ${aoe.y - aoe.rOuter} A ${aoe.rOuter} ${aoe.rOuter} 0 1 1 ${aoe.x} ${aoe.y + aoe.rOuter} A ${aoe.rOuter} ${aoe.rOuter} 0 1 1 ${aoe.x} ${aoe.y - aoe.rOuter} Z 
                   M ${aoe.x} ${aoe.y - aoe.rInner} A ${aoe.rInner} ${aoe.rInner} 0 1 0 ${aoe.x} ${aoe.y + aoe.rInner} A ${aoe.rInner} ${aoe.rInner} 0 1 0 ${aoe.x} ${aoe.y - aoe.rInner} Z`} 
              />
            );
            if (aoe.type === 'rect') return (
              <rect key={aoe.id} x={aoe.x - aoe.w / 2} y={aoe.y - aoe.h / 2} width={aoe.w} height={aoe.h} fill={currentColor} 
                transform={`rotate(${aoe.angle}, ${aoe.x}, ${aoe.y})`} className={aoe.isTelegraph ? "" : "animate-pulse"} />
            );
            return null;
          })}

          {/* Bosses */}
          {gameState !== GAME_STATE.IDLE && (
            <>
              <Wind size={6} x={getCoords(bosses.garuda.angle, 15).x - 3} y={getCoords(bosses.garuda.angle, 15).y - 3} className="text-green-500 opacity-80" />
              <Flame size={6} x={getCoords(bosses.ifrit.angle, 42).x - 3} y={getCoords(bosses.ifrit.angle, 42).y - 3} className="text-red-500 opacity-80" />
              <Mountain size={6} x={getCoords(bosses.titan.angle, 42).x - 3} y={getCoords(bosses.titan.angle, 42).y - 3} className="text-yellow-600 opacity-80" />
              <Zap size={6} x={getCoords(bosses.ultima.angle, 42).x - 3} y={getCoords(bosses.ultima.angle, 42).y - 3} className="text-purple-500 opacity-80" />
            </>
          )}

          {/* Player */}
          <circle cx={playerPos.x} cy={playerPos.y} r="2" fill="white" stroke="#3b82f6" strokeWidth="0.5" className="shadow-lg" />
        </svg>

        {/* Overlays */}
        {(gameState === GAME_STATE.IDLE || gameState === GAME_STATE.FAILED || gameState === GAME_STATE.DONE) && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50">
            {gameState === GAME_STATE.FAILED && (
              <div className="flex flex-col items-center mb-8 text-red-500">
                <AlertTriangle size={64} className="mb-4" />
                <h2 className="text-4xl font-black italic tracking-tighter">PREDATED</h2>
                <p className="text-slate-400 font-bold mt-2 font-mono">被機制吃掉啦！</p>
              </div>
            )}
            {gameState === GAME_STATE.DONE && (
               <div className="flex flex-col items-center mb-8 text-green-500">
                <CheckCircle2 size={64} className="mb-4" />
                <h2 className="text-4xl font-black italic tracking-tighter">CLEARED</h2>
                <p className="text-slate-400 font-bold mt-2 font-mono">完美走位！</p>
              </div>
            )}
            <button
              onClick={startSimulation}
              className="group relative bg-slate-100 hover:bg-white text-slate-950 px-12 py-4 rounded-full font-black text-xl shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all active:scale-95 flex items-center gap-4 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-500 opacity-0 group-hover:opacity-10 transition-opacity" />
              <Play fill="currentColor" size={20} />
              {gameState === GAME_STATE.IDLE ? '開始挑戰' : '再試一次'}
            </button>
            <p className="mt-8 text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">WASD To Move</p>
          </div>
        )}

        {gameState === GAME_STATE.PREPARING && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-[1em] mb-2">Prepare</span>
            <span className="text-8xl font-black text-white/10 italic leading-none">{Math.ceil(timer)}</span>
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div className="mt-8 w-full max-w-xl grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex flex-col items-center">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Direction Controls</span>
          <div className="grid grid-cols-3 gap-2">
            <div></div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${keysPressed.current['w'] ? 'bg-orange-500 border-orange-400 text-white' : 'border-slate-800 text-slate-700'}`}>W</div>
            <div></div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${keysPressed.current['a'] ? 'bg-orange-500 border-orange-400 text-white' : 'border-slate-800 text-slate-700'}`}>A</div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${keysPressed.current['s'] ? 'bg-orange-500 border-orange-400 text-white' : 'border-slate-800 text-slate-700'}`}>S</div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${keysPressed.current['d'] ? 'bg-orange-500 border-orange-400 text-white' : 'border-slate-800 text-slate-700'}`}>D</div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tuning Panel</span>
             <button onClick={() => setShowTuning(!showTuning)} className="text-[10px] font-bold text-orange-500 underline uppercase tracking-tighter">
               {showTuning ? 'Hide' : 'Show'}
             </button>
          </div>
          
          {showTuning ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-400 italic">Start Delay</span>
                  <span className="text-orange-500">{startDelay.toFixed(1)}s</span>
                </div>
                <input type="range" min="1" max="5" step="0.5" value={startDelay} onChange={(e) => setStartDelay(parseFloat(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-400 italic">Total Duration</span>
                  <span className="text-orange-500">{mechanicDuration.toFixed(1)}s</span>
                </div>
                <input type="range" min="5" max="15" step="0.5" value={mechanicDuration} onChange={(e) => setMechanicDuration(parseFloat(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-400 italic">Delay N (Start -&gt; Wheel)</span>
                  <span className="text-blue-500">{delayN.toFixed(1)}s</span>
                </div>
                <input type="range" min="0" max="10" step="0.1" value={delayN} onChange={(e) => setDelayN(parseFloat(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-400 italic">Delay X (Wheel -&gt; Seiken)</span>
                  <span className="text-blue-500">{delayX.toFixed(1)}s</span>
                </div>
                <input type="range" min="0" max="10" step="0.1" value={delayX} onChange={(e) => setDelayX(parseFloat(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-400 italic">Delay A (Seiken -&gt; Ghost)</span>
                  <span className="text-blue-500">{delayA.toFixed(1)}s</span>
                </div>
                <input type="range" min="0" max="10" step="0.1" value={delayA} onChange={(e) => setDelayA(parseFloat(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-400 italic">Titan Fan Angle (地裂間隔)</span>
                  <span className="text-orange-500">{titanFanAngle}°</span>
                </div>
                <input type="range" min="15" max="90" step="5" value={titanFanAngle} onChange={(e) => setTitanFanAngle(parseInt(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-400 italic">Ifrit Dash Width (衝鋒寬度)</span>
                  <span className="text-red-500">{ifritDashWidth}u</span>
                </div>
                <input type="range" min="10" max="50" step="1" value={ifritDashWidth} onChange={(e) => setIfritDashWidth(parseInt(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-400 italic">Ifrit Cross Width (十字寬度)</span>
                  <span className="text-red-500">{ifritCrossWidth}u</span>
                </div>
                <input type="range" min="5" max="30" step="1" value={ifritCrossWidth} onChange={(e) => setIfritCrossWidth(parseInt(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-400 italic">Garuda Wheel Size (鋼鐵)</span>
                  <span className="text-green-500">{garudaWheelRadius}u</span>
                </div>
                <input type="range" min="5" max="40" step="1" value={garudaWheelRadius} onChange={(e) => setGarudaWheelRadius(parseInt(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-green-500" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-400 italic">Garuda Tornado Inner (月內)</span>
                  <span className="text-green-500">{garudaTornadoInner}u</span>
                </div>
                <input type="range" min="5" max="40" step="1" value={garudaTornadoInner} onChange={(e) => setGarudaTornadoInner(parseInt(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-green-500" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-400 italic">Garuda Tornado Outer (月外)</span>
                  <span className="text-green-500">{garudaTornadoOuter}u</span>
                </div>
                <input type="range" min="20" max="100" step="1" value={garudaTornadoOuter} onChange={(e) => setGarudaTornadoOuter(parseInt(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-green-500" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
               <RefreshCw size={16} className="text-slate-700" />
               <span className="text-[8px] font-bold text-slate-700 uppercase">Interactive simulation ready</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 text-slate-800 text-[8px] font-black uppercase tracking-[0.5em] opacity-30 select-none">
         Anti-Gravity Mechanic Engine v1.0 • UWU PREDATION SIM
      </div>
    </div>
  );
};

export default UltimatePredationSim;
