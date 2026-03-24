import React, { useState, useEffect } from 'react';
import submarineData from '../data/submarine_materials.json';

const SubmarineGathering = () => {
  console.log('SubmarineGathering Component Rendered');
  const [selectedParts, setSelectedParts] = useState({
    船體: '鯊魚級',
    船首: '鯊魚級',
    船尾: '鯊魚級',
    艦橋: '鯊魚級',
  });
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(localStorage.getItem('submarine_gas_url') || '');
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  console.log('Full submarineData object:', submarineData);
  const classes = submarineData ? Object.keys(submarineData) : [];
  console.log('Classes detected:', classes);
  const partTypes = ['船體', '船首', '船尾', '艦橋'];

  useEffect(() => {
    if (submarineData && Object.keys(submarineData).length > 0) {
      calculateTotalMaterials();
    }
  }, [selectedParts, submarineData]);

  const calculateTotalMaterials = () => {
    console.log('Calculating for parts:', selectedParts);
    if (!submarineData) return;

    try {
      const total = {};
      partTypes.forEach(part => {
        const className = selectedParts[part];
        const classData = submarineData[className];
        if (classData && classData[part]) {
          const partMaterials = classData[part];
          Object.entries(partMaterials).forEach(([name, qty]) => {
            total[name] = (total[name] || 0) + qty;
          });
        }
      });
      
      const materialList = Object.entries(total).map(([name, required]) => ({
        name,
        required,
        gathered: 0
      }));
      setMaterials(materialList);
    } catch (e) {
      console.error('Calculation error:', e);
    }
  };

  const fetchSpreadsheetData = async () => {
    if (!spreadsheetUrl) return;
    setLoading(true);
    try {
      const res = await fetch(spreadsheetUrl);
      const data = await res.json();
      if (Array.isArray(data)) {
        const updatedMaterials = [...materials];
        data.forEach(row => {
          const m = updatedMaterials.find(item => item.name === row['素材名稱']);
          if (m) m.gathered = parseInt(row['已蒐集數量']) || 0;
        });
        setMaterials(updatedMaterials);
      }
    } catch (e) {
      console.error('Fetch error:', e);
      alert('無法取得試算表資料。');
    } finally {
      setLoading(false);
    }
  };

  const syncToSpreadsheet = async () => {
    if (!spreadsheetUrl) return;
    setLoading(true);
    try {
      await fetch(spreadsheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_all', materials })
      });
      alert('已同步至試算表！');
    } catch (e) {
      console.error('Sync error:', e);
    } finally {
      setLoading(false);
    }
  };

  const updateGathered = (index, delta) => {
    const newMaterials = [...materials];
    newMaterials[index].gathered = Math.max(0, Math.min(newMaterials[index].required, newMaterials[index].gathered + delta));
    setMaterials(newMaterials);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto bg-slate-950 text-slate-100 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
            潛水艇素材清單
          </h1>
          <p className="text-slate-400 mt-2 font-medium">選擇船隻部位，自動加總所需材料</p>
        </div>
        <button 
          onClick={() => setShowConfig(!showConfig)}
          className="bg-slate-800 hover:bg-slate-700 p-2 rounded-full border border-slate-700 transition-all"
          title="設定試算表同步"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
      
      {showConfig && (
        <div className="bg-slate-900 p-5 rounded-2xl mb-8 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
          <h2 className="text-lg font-bold mb-3 text-blue-400 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            試算表同步設定 (選用)
          </h2>
          <div className="flex flex-wrap gap-3">
            <input 
              type="text" 
              className="flex-1 min-w-[300px] p-3 bg-slate-800 rounded-xl border border-slate-700 outline-none focus:border-blue-500 transition-colors"
              placeholder="貼上您的 Apps Script URL"
              value={spreadsheetUrl}
              onChange={(e) => setSpreadsheetUrl(e.target.value)}
            />
            <button onClick={() => { localStorage.setItem('submarine_gas_url', spreadsheetUrl); alert('URL 已儲存'); }} className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95">儲存 URL</button>
            <button onClick={fetchSpreadsheetData} className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl font-bold border border-slate-700 transition-all active:scale-95">讀取資料</button>
          </div>
          <p className="text-xs text-slate-500 mt-3">※ 若尚未串接試算表，下方的「已蒐集」進度將僅存於本瀏覽器暫時顯示。</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {partTypes.map(part => (
          <div key={part} className="group bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-blue-500/50 transition-all duration-300">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 group-hover:text-blue-400 transition-colors">{part}</label>
            <select 
              className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
              value={selectedParts[part]}
              onChange={(e) => setSelectedParts({...selectedParts, [part]: e.target.value})}
            >
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-sm">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            材料清單加總
          </h2>
          {spreadsheetUrl && (
            <button 
              onClick={syncToSpreadsheet}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 px-6 py-2.5 rounded-full font-bold text-sm shadow-xl transition-all active:scale-95 flex items-center gap-2"
            >
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : null}
              同步至試算表
            </button>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 text-xs font-black uppercase tracking-wider bg-slate-950/50">
                <th className="px-6 py-4">素材名稱</th>
                <th className="px-6 py-4 text-center">需求</th>
                <th className="px-6 py-4">進度更新</th>
                <th className="px-6 py-4">蒐集進度</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {materials.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-slate-500 italic">
                    尚未選擇部位或資料載入中... (材料數量為 0)
                  </td>
                </tr>
              ) : (
                materials.map((m, i) => {
                  const percent = Math.round((m.gathered / m.required) * 100);
                  return (
                    <tr key={m.name} className="group hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-5">
                        <div className="font-bold text-slate-200 group-hover:text-white">{m.name}</div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="bg-slate-800 px-3 py-1 rounded-lg font-mono text-blue-300 border border-slate-700">{m.required}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => updateGathered(i, -1)} className="w-9 h-9 bg-slate-800 hover:bg-red-900/40 rounded-xl text-slate-400 hover:text-red-400 border border-slate-700 transition-all">-</button>
                          <div className="w-12 text-center font-black text-lg">{m.gathered}</div>
                          <button onClick={() => updateGathered(i, 1)} className="w-9 h-9 bg-slate-800 hover:bg-green-900/40 rounded-xl text-slate-400 hover:text-green-400 border border-slate-700 transition-all">+</button>
                          <button onClick={() => updateGathered(i, 10)} className="px-3 h-9 bg-slate-800 hover:bg-blue-900/40 rounded-xl text-slate-400 hover:text-blue-400 border border-slate-700 text-xs font-bold transition-all">+10</button>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="w-full min-w-[120px]">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter mb-1.5 text-slate-500">
                            <span>Progress</span>
                            <span className={percent === 100 ? 'text-green-400' : 'text-blue-400'}>{percent}%</span>
                          </div>
                          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700/50">
                            <div 
                              className={`h-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(59,130,246,0.3)] ${percent === 100 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-blue-600 to-blue-400'}`} 
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {!submarineData && (
        <div className="mt-4 p-4 bg-red-900/20 shadow-lg text-red-400 rounded-xl border border-red-500/30 text-center">
          錯誤：無法讀取 submarine_materials.json 工具資料，請檢查路徑。
        </div>
      )}
      
      <div className="mt-12 text-center text-slate-600 text-xs font-medium border-t border-slate-900 pt-8">
        <p>FF14 Submarine Gathering Assistant v1.0 • 資料來源：HuijiWiki</p>
      </div>
    </div>
  );
};


export default SubmarineGathering;
