import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Play, RefreshCw, Flame, Heart, AlertTriangle, CheckCircle2 } from 'lucide-react';

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
  PILLARS: 'PILLARS',
  SIDE_PREPARE: 'SIDE_PREPARE',
  SIDE_DASHES: 'SIDE_DASHES',
  SEQ_PREPARE: 'SEQ_PREPARE',
  SEQ_DASHES: 'SEQ_DASHES',
  BLUE_AFTER: 'BLUE_AFTER',
  DONE: 'DONE',
  FAILED: 'FAILED',
};

const IfritSim = () => {
  const [gameState, setGameState] = useState(GAME_STATE.IDLE);
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 50 });
  const [pillars, setPillars] = useState([]);
  const [dashes, setDashes] = useState([]); 
  const [blueIndex, setBlueIndex] = useState(-1);
  const [timer, setTimer] = useState(0);

  // Tuning Parameters (Finalized Defaults)
  const [seqDelay, setSeqDelay] = useState(3.0);
  const [seqInterval, setSeqInterval] = useState(1.0);
  const [blueDelay, setBlueDelay] = useState(0.4);
  const [showTuning, setShowTuning] = useState(false);
  
  const requestRef = useRef();
  const keysPressed = useRef({});
  const lastTimeRef = useRef();
  const gameTimeRef = useRef(0);

  const startSimulation = () => {
    // Generate Pillars (Trapezoid)
    // i-2 (BL), i+3 (BR), i (TL), i+1 (TR)
    const i = Math.floor(Math.random() * 8);
    const bl = (i - 2 + 8) % 8;
    const br = (i + 3) % 8;
    const tl = i;
    const tr = (i + 1) % 8;
    
    // Order: Long-side-Left -> Long-side-Right -> Short-side-Left -> Short-side-Right
    const sortedPillars = [bl, br, tl, tr];

    setPillars(sortedPillars);
    setBlueIndex(Math.floor(Math.random() * 4));
    setPlayerPos({ x: 50, y: 50 });
    setGameState(GAME_STATE.PILLARS);
    setDashes([]);
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
    const speed = 0.05 * dt; 
    let nextPos = { ...playerPos };
    if (keysPressed.current['w']) nextPos.y -= speed;
    if (keysPressed.current['s']) nextPos.y += speed;
    if (keysPressed.current['a']) nextPos.x -= speed;
    if (keysPressed.current['d']) nextPos.x += speed;

    const dist = Math.sqrt(Math.pow(nextPos.x - 50, 2) + Math.pow(nextPos.y - 50, 2));
    if (dist < 46) {
      setPlayerPos(nextPos);
    }
  };

  const handleLogic = () => {
    const t = gameTimeRef.current;
    
    if (gameState === GAME_STATE.PILLARS && t > 3) {
      setGameState(GAME_STATE.SIDE_PREPARE);
    }
    
    if (gameState === GAME_STATE.SIDE_PREPARE) {
      setTimer(6 - t);
      if (t > 6) {
        setGameState(GAME_STATE.SIDE_DASHES);
      }
    }

    if (gameState === GAME_STATE.SIDE_DASHES) {
      if (t > 7 && dashes.length === 0) {
        setDashes([
          { id: 'N', x: 50, y: 50, w: 40, h: 100, angle: 0 },
          { id: 'E', x: 50, y: 50, w: 100, h: 40, angle: 0 },
        ]);
      }
      if (t > 8) {
        setGameState(GAME_STATE.SEQ_PREPARE);
        setDashes([]);
      }
    }

    if (gameState === GAME_STATE.SEQ_PREPARE) {
      const seqStartTime = 8 + seqDelay;
      setTimer(seqStartTime - t);
      if (t > seqStartTime) {
        setGameState(GAME_STATE.SEQ_DASHES);
      }
    }

    if (gameState === GAME_STATE.SEQ_DASHES) {
      const seqStart = 8 + seqDelay;
      const currentDashIndex = Math.floor((t - seqStart) / seqInterval);
      
      if (currentDashIndex >= 0 && currentDashIndex < 4) {
        const timeInInterval = (t - seqStart) % seqInterval;
        if (timeInInterval < seqInterval / 2) {
          const pillarIndex = pillars[currentDashIndex];
          const angle = directions[pillarIndex].angle;
          setDashes([{ id: `seq-${currentDashIndex}`, x: 50, y: 50, w: 30, h: 100, angle }]);
        } else {
          setDashes([]);
        }
      } else if (currentDashIndex >= 4) {
        setGameState(GAME_STATE.BLUE_AFTER);
        setDashes([]);
      }
    }

    if (gameState === GAME_STATE.BLUE_AFTER) {
      const seqEndTime = 8 + seqDelay + (4 * seqInterval);
      const explosionTime = seqEndTime + blueDelay;
      if (t > explosionTime && dashes.length === 0) {
        const bluePillar = pillars[blueIndex];
        const isCardinal = bluePillar % 2 === 0;
        if (isCardinal) {
          setDashes([
            { id: 'B1', x: 50, y: 50, w: 30, h: 150, angle: 45 },
            { id: 'B2', x: 50, y: 50, w: 30, h: 150, angle: 135 },
          ]);
        } else {
          setDashes([
            { id: 'B1', x: 50, y: 50, w: 30, h: 150, angle: 0 },
            { id: 'B2', x: 50, y: 50, w: 150, h: 30, angle: 0 },
          ]);
        }
      }
      if (t > explosionTime + 1.5) {
        setGameState(GAME_STATE.DONE);
        setDashes([]);
      }
    }
  };

  const checkCollisions = () => {
    if (dashes.length === 0) return;
    for (const dash of dashes) {
      const rad = -dash.angle * (Math.PI / 180);
      const dx = playerPos.x - dash.x;
      const dy = playerPos.y - dash.y;
      const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
      if (Math.abs(rx) < dash.w / 2 && Math.abs(ry) < dash.h / 2) {
        setGameState(GAME_STATE.FAILED);
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
  }, [gameState, playerPos]);

  const getCoordinates = (angle, radius = 40) => {
    const radian = (angle - 90) * (Math.PI / 180);
    const x = 50 + radius * Math.cos(radian);
    const y = 50 + radius * Math.sin(radian);
    return { x, y };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-4">
      <div className="w-full max-w-4xl flex items-center justify-between mb-4">
        <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft size={20} />
          <span className="font-bold">返回首頁</span>
        </Link>
        <h1 className="text-2xl font-black tracking-tight text-orange-500 uppercase italic">Ifrit Dash Simulation</h1>
        <div className="w-24"></div>
      </div>

      <div className="relative w-full aspect-square max-w-[70vh] bg-slate-900 rounded-full border-4 border-slate-800 shadow-[0_0_100px_-20px_rgba(249,115,22,0.15)] overflow-hidden flex items-center justify-center select-none">
        <svg viewBox="0 0 100 100" className="w-full h-full p-0 pointer-events-none overflow-visible">
          <circle cx="50" cy="50" r="48" fill="none" stroke="#1e293b" strokeWidth="0.5" />
          <line x1="50" y1="2" x2="50" y2="98" stroke="#1e293b" strokeWidth="0.1" />
          <line x1="2" y1="50" x2="98" y2="50" stroke="#1e293b" strokeWidth="0.1" />
          
          {dashes.map((dash) => (
             <rect 
               key={dash.id}
               x={dash.x - dash.w / 2} y={dash.y - dash.h / 2} width={dash.w} height={dash.h} 
               fill="rgba(239, 68, 68, 0.4)" stroke="rgba(239, 68, 68, 0.8)" strokeWidth="0.5"
               transform={`rotate(${dash.angle}, ${dash.x}, ${dash.y})`}
               className="animate-pulse"
             />
          ))}

          {(gameState === GAME_STATE.PILLARS || gameState === GAME_STATE.SIDE_PREPARE || gameState === GAME_STATE.SEQ_PREPARE) && pillars.map((index, i) => {
            const { x, y } = getCoordinates(directions[index].angle, 40);
            return <circle key={i} cx={x} cy={y} r="3" className="fill-orange-500 shadow-orange-500 animate-pulse" />;
          })}

          {(gameState === GAME_STATE.SEQ_DASHES || gameState === GAME_STATE.BLUE_AFTER) && pillars.map((index, i) => {
             const { x, y } = getCoordinates(directions[index].angle, 48);
             return <circle key={i} cx={x} cy={y} r="4" fill={i === blueIndex ? "#3b82f6" : "#f97316"} opacity="0.6" />;
          })}

          {gameState === GAME_STATE.SIDE_DASHES && (
            <>
              <circle cx="50" cy="2" r="5" fill="#ef4444" opacity="0.8" />
              <circle cx="98" cy="50" r="5" fill="#ef4444" opacity="0.8" />
            </>
          )}

          <circle cx={playerPos.x} cy={playerPos.y} r="2" fill="white" stroke="#3b82f6" strokeWidth="0.5" className="shadow-lg" />
        </svg>

        {(gameState === GAME_STATE.IDLE || gameState === GAME_STATE.FAILED || gameState === GAME_STATE.DONE) && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50">
            {gameState === GAME_STATE.FAILED && (
              <div className="flex flex-col items-center mb-8 text-red-500">
                <AlertTriangle size={64} className="mb-4" />
                <h2 className="text-4xl font-black">WIPED</h2>
                <p className="text-slate-400 font-bold mt-2">被火神衝死啦！</p>
              </div>
            )}
            {gameState === GAME_STATE.DONE && (
               <div className="flex flex-col items-center mb-8 text-green-500">
                <CheckCircle2 size={64} className="mb-4" />
                <h2 className="text-4xl font-black">SUCCESS</h2>
                <p className="text-slate-400 font-bold mt-2">完美閃避！</p>
              </div>
            )}
            <button
              onClick={startSimulation}
              className="bg-orange-600 hover:bg-orange-500 text-white px-10 py-5 rounded-2xl font-black text-2xl shadow-xl transition-all active:scale-95 flex items-center gap-4"
            >
              <Play fill="white" size={24} />
              {gameState === GAME_STATE.IDLE ? '開始挑戰' : '再試一次'}
            </button>
            <p className="mt-6 text-slate-500 text-sm font-medium">使用 WASD 控制玩家位移</p>
          </div>
        )}

        {(gameState === GAME_STATE.SIDE_PREPARE || gameState === GAME_STATE.SEQ_PREPARE) && (
          <div className="absolute top-1/4 flex flex-col items-center pointer-events-none">
            <span className="text-xs font-bold text-slate-500 tracking-widest uppercase">Prepare for Dash</span>
            <span className="text-6xl font-black text-white/20">{Math.ceil(timer)}</span>
          </div>
        )}
      </div>

      {showTuning && (
        <div className="mt-8 w-full max-w-xl bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-slate-800 shadow-2xl animate-in slide-in-from-bottom duration-500">
          <div className="flex items-center justify-between mb-6">
             <div className="flex items-center gap-2 text-orange-400">
                <RefreshCw size={20} className="animate-spin-slow" />
                <h3 className="font-black uppercase tracking-wider text-sm">時序調節面板</h3>
             </div>
             <button 
               onClick={() => setShowTuning(false)}
               className="text-[10px] bg-slate-800 px-3 py-1 rounded-full text-slate-500 hover:text-white transition-colors"
             >
               隱藏面板
             </button>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">1. 第一衝延遲 (柱子消失後)</span>
                <span className="text-orange-500">{seqDelay.toFixed(1)}s</span>
              </div>
              <input 
                type="range" min="0" max="10" step="0.5" 
                value={seqDelay} onChange={(e) => setSeqDelay(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">2. 衝鋒間隔時間</span>
                <span className="text-orange-500">{seqInterval.toFixed(1)}s</span>
              </div>
              <input 
                type="range" min="0.1" max="5" step="0.1" 
                value={seqInterval} onChange={(e) => setSeqInterval(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">3. 藍火神爆炸延遲</span>
                <span className="text-orange-500">{blueDelay.toFixed(1)}s</span>
              </div>
              <input 
                type="range" min="0" max="5" step="0.1" 
                value={blueDelay} onChange={(e) => setBlueDelay(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Movement Controls UI Helper */}
      <div className="mt-8 grid grid-cols-3 gap-2">
         <div></div>
         <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 ${keysPressed.current['w'] ? 'bg-orange-600 border-orange-400 scale-95' : 'border-slate-800 text-slate-600'}`}>W</div>
         <div></div>
         <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 ${keysPressed.current['a'] ? 'bg-orange-600 border-orange-400 scale-95' : 'border-slate-800 text-slate-600'}`}>A</div>
         <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 ${keysPressed.current['s'] ? 'bg-orange-600 border-orange-400 scale-95' : 'border-slate-800 text-slate-600'}`}>S</div>
         <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 ${keysPressed.current['d'] ? 'bg-orange-600 border-orange-400 scale-95' : 'border-slate-800 text-slate-600'}`}>D</div>
      </div>

      {!showTuning && (
        <button 
          onClick={() => setShowTuning(true)}
          className="mt-4 text-slate-600 hover:text-orange-500 text-[10px] font-bold uppercase tracking-widest transition-colors"
        >
          開啟調節面板
        </button>
      )}
      <div className="mt-8 text-slate-700 text-[8px] font-medium uppercase tracking-[0.3em] opacity-50">
         Ultimate Weapon Practive Tool v0.3
      </div>
    </div>
  );
};

export default IfritSim;
