import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import submarineData from '../data/submarine_materials.json';
import ItemDetailView from './ItemDetailView';
import { decomposeMaterials } from '../utils/submarineMaterialDecomposer';
import { supabase } from '../supabaseClient';

const SubmarineGathering = () => {
  console.log('SubmarineGathering Component Rendered');
  const [selectedParts, setSelectedParts] = useState({
    船體: '鯊魚級',
    船首: '鯊魚級',
    船尾: '鯊魚級',
    艦橋: '鯊魚級',
  });
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedItemName, setSelectedItemName] = useState(null);
  const [isDeepView, setIsDeepView] = useState(true);
  const [recipeData, setRecipeData] = useState(null);
  const [itemsMap, setItemsMap] = useState(null);
  const [gatheringData, setGatheringData] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [supabaseCounts, setSupabaseCounts] = useState({});

  console.log('Full submarineData object:', submarineData);
  const classes = submarineData ? Object.keys(submarineData) : [];
  console.log('Classes detected:', classes);
  const partTypes = ['船體', '船首', '船尾', '艦橋'];

  useEffect(() => {
    if (submarineData && Object.keys(submarineData).length > 0) {
      calculateTotalMaterials();
    }
  }, [selectedParts, submarineData, isDeepView, recipeData, itemsMap, gatheringData]);

  // Load deep data if toggle is enabled or by default
  useEffect(() => {
    if (isDeepView && (!recipeData || !itemsMap || !gatheringData)) {
      loadDeepData();
    }
  }, [isDeepView]);

  // Initial fetch from Supabase
  useEffect(() => {
    const initSupabase = async () => {
      try {
        const { data, error } = await supabase.from('submarine_gathered').select('*');
        if (error) throw error;
        const counts = {};
        data.forEach(row => {
          counts[row.name] = row.count;
        });
        setSupabaseCounts(counts);
      } catch (err) {
        console.error('Initial Supabase fetch failed:', err);
      }
    };
    initSupabase();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('submarine_realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'submarine_gathered' }, 
        (payload) => {
          console.log('Realtime change received:', payload);
          if (payload.new) {
            setSupabaseCounts(prev => ({
              ...prev,
              [payload.new.name]: payload.new.count
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadDeepData = async () => {
    setDataLoading(true);
    try {
      const [itemsRes, recipesRes, gatheringRes] = await Promise.all([
        fetch(`${import.meta.env.BASE_URL}data/items.json`),
        fetch(`${import.meta.env.BASE_URL}data/recipes.json`),
        fetch(`${import.meta.env.BASE_URL}data/gathering.json`),
      ]);
      const items = await itemsRes.json();
      const recipes = await recipesRes.json();
      const gathering = await gatheringRes.json();
      
      setItemsMap(items.items || items);
      setRecipeData(recipes.recipes || recipes);
      setGatheringData(gathering.points || gathering);
    } catch (err) {
      console.error('Error loading deep data:', err);
      alert('無法載入配方資料');
      setIsDeepView(false);
    } finally {
      setDataLoading(false);
    }
  };


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
      

      let materialList = Object.entries(total).map(([name, amount]) => ({ name, amount }));

      if (isDeepView && recipeData && itemsMap) {
        materialList = decomposeMaterials(materialList, recipeData, itemsMap);
        
        // Sorting by gathering location if gatheringData is available
        if (gatheringData) {
          const itemNamesToId = {};
          Object.entries(itemsMap).forEach(([id, item]) => {
            itemNamesToId[item.name] = id;
          });

          materialList.sort((a, b) => {
            const idA = itemNamesToId[a.name];
            const idB = itemNamesToId[b.name];
            const nodesA = gatheringData[idA] || [];
            const nodesB = gatheringData[idB] || [];
            
            const hasNodesA = nodesA.length > 0;
            const hasNodesB = nodesB.length > 0;

            if (hasNodesA && !hasNodesB) return -1;
            if (!hasNodesA && hasNodesB) return 1;
            
            if (hasNodesA && hasNodesB) {
              const nodeA = nodesA[0];
              const nodeB = nodesB[0];
              
              if (nodeA.placeName !== nodeB.placeName) {
                return nodeA.placeName.localeCompare(nodeB.placeName);
              }
              return nodeA.level - nodeB.level;
            }

            return a.name.localeCompare(b.name);
          });
        }
      }

      setMaterials(prev => {
        return materialList.map(m => {
          const name = m.name;
          const required = m.required || m.amount;
          
          // Priority: supabaseCounts (shared) > current state > 0
          const gathered = supabaseCounts[name] !== undefined 
            ? supabaseCounts[name] 
            : (prev.find(item => item.name === name)?.gathered || 0);

          return {
            name,
            required,
            gathered
          };
        });
      });
    } catch (e) {
      console.error('Calculation error:', e);
    }
  };

  // Keep local calculation in sync when supabaseCounts updates
  useEffect(() => {
    calculateTotalMaterials();
  }, [supabaseCounts]);


  const fetchSpreadsheetData = async () => {
    if (!spreadsheetUrl) return;
    setLoading(true);
    try {
      const res = await fetch(spreadsheetUrl);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMaterials(prev => {
          return prev.map(m => {
            const row = data.find(r => r['素材名稱'] === m.name);
            if (row) {
              return {
                ...m,
                gathered: parseInt(row['已蒐集數量']) || 0
              };
            }
            return m;
          });
        });
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

  const updateGathered = async (index, delta) => {
    const material = materials[index];
    if (!material) return;

    const newGathered = Math.max(0, Math.min(material.required, material.gathered + delta));
    handleUpdate(material.name, newGathered, index);
  };

  const handleUpdate = async (name, value, index) => {
    // Update local state immediately for UI responsiveness
    setMaterials(prev => prev.map((m, i) => i === index || m.name === name ? { ...m, gathered: value } : m));

    // Update Supabase
    try {
      const { error } = await supabase
        .from('submarine_gathered')
        .upsert({ name, count: value }, { onConflict: 'name' });
      
      if (error) throw error;
    } catch (err) {
      console.error('Error updating Supabase:', err);
    }
  };

  const resetAllCounts = async () => {
    if (!window.confirm('確定要將所有材料收集數量重置為 0 嗎？')) return;
    
    setLoading(true);
    try {
      // For safety, we set all counts in our current list to 0 in Supabase
      const updates = materials.map(m => ({ name: m.name, count: 0 }));
      
      const { error } = await supabase
        .from('submarine_gathered')
        .upsert(updates, { onConflict: 'name' });
      
      if (error) throw error;

      // Update local cache
      setSupabaseCounts(prev => {
        const next = { ...prev };
        materials.forEach(m => { next[m.name] = 0; });
        return next;
      });
      
      alert('所有進度已清零');
    } catch (err) {
      console.error('Reset error:', err);
      alert('清零失敗: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 font-sans relative overflow-x-hidden">
      {/* Premium Background Elements */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black"></div>
      <div className="fixed inset-0 -z-10 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] -z-10 animate-pulse"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 rounded-full blur-[120px] -z-10 animate-pulse delay-700"></div>

      <div className="max-w-[1600px] mx-auto p-6 lg:p-10 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 tracking-tight">
              潛水艇素材清單
            </h1>
            <p className="text-slate-400 mt-2 font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              選擇船隻部位，自動加總所需材料與管理蒐集進度
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowConfig(!showConfig)}
              className={`p-3 rounded-2xl border transition-all duration-300 flex items-center gap-2 font-bold text-sm ${showConfig ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white backdrop-blur-md'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {showConfig ? '隱藏設定' : '同步設定'}
            </button>

            <button 
              onClick={resetAllCounts}
              disabled={loading}
              className="p-3 px-6 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300 flex items-center gap-2 font-black text-sm backdrop-blur-md"
            >
              <Trash2 className="h-4 w-4" />
              一鍵清零
            </button>

            <button 
              onClick={() => setIsDeepView(!isDeepView)}
              disabled={dataLoading}
              className={`p-3 px-6 rounded-2xl border transition-all duration-300 flex items-center gap-3 font-black text-sm ${isDeepView ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white backdrop-blur-md'}`}
            >
              <div className={`w-2 h-2 rounded-full ${isDeepView ? 'bg-white animate-pulse' : 'bg-slate-600'}`}></div>
              {dataLoading ? '載入中...' : isDeepView ? '基礎材料 (已開啟)' : '基礎材料 (已關閉)'}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </button>
          </div>
        </div>
        
        {showConfig && (
          <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl mb-10 border border-blue-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.4)] animate-in slide-in-from-top duration-300">
            <h2 className="text-lg font-black mb-4 text-blue-400 flex items-center gap-2 uppercase tracking-widest">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
              Apps Script 同步伺服器
            </h2>
            <div className="flex flex-wrap gap-4">
              <input 
                type="text" 
                className="flex-1 min-w-[300px] p-4 bg-slate-800/50 rounded-2xl border border-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-mono text-sm"
                placeholder="貼上您的部署 URL (https://script.google.com/macros/s/...)"
                value={spreadsheetUrl}
                onChange={(e) => setSpreadsheetUrl(e.target.value)}
              />
              <button onClick={() => { alert('URL 已暫時更新，重新整理後將重置。'); }} className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-2xl font-black transition-all shadow-[0_5px_15px_rgba(59,130,246,0.3)] active:scale-95">更新連線</button>
              <button onClick={fetchSpreadsheetData} className="bg-slate-800 hover:bg-slate-700 px-8 py-4 rounded-2xl font-black border border-slate-700 transition-all active:scale-95">自雲端拉取</button>
            </div>
            <p className="text-[10px] text-slate-500 mt-4 font-bold uppercase tracking-wider italic opacity-60">
              ※ 此功能會與 Google 試算表連動，目前此頁面優先使用 Supabase 進行即時協作同步。
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Main Content Column */}
          <div className="lg:col-span-8 space-y-10">
            {/* Component Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {partTypes.map(part => (
                <div key={part} className="group bg-slate-900/40 backdrop-blur-md p-5 rounded-3xl border border-white/5 hover:border-blue-500/40 transition-all duration-500 shadow-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] group-hover:text-blue-400 transition-colors">{part}</label>
                  </div>
                  <select 
                    className="w-full bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer font-bold text-slate-200"
                    value={selectedParts[part]}
                    onChange={(e) => setSelectedParts({...selectedParts, [part]: e.target.value})}
                  >
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Materials Summary Table */}
            <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-white/5 shadow-3xl">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-slate-900/50 to-transparent">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">材料加總報表</h2>
                </div>
                {spreadsheetUrl && (
                  <button 
                    onClick={syncToSpreadsheet}
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 px-8 py-3 rounded-2xl font-black text-xs shadow-2xl transition-all active:scale-95 flex items-center gap-3 uppercase tracking-widest border border-emerald-400/20"
                  >
                    {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : null}
                    推送到試算表
                  </button>
                )}
              </div>
              
              <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] bg-slate-950/30">
                      <th className="px-8 py-5">素材名稱 (關鍵字)</th>
                      <th className="px-8 py-5 text-center">總需求</th>
                      <th className="px-8 py-5">快速更新</th>
                      <th className="px-8 py-5 min-w-[200px]">蒐集狀態</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {materials.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-8 py-20 text-center text-slate-600 font-bold italic">
                          等待資料載入或尚未選擇部位...
                        </td>
                      </tr>
                    ) : (
                      materials.map((m, i) => {
                        const percent = Math.round((m.gathered / m.required) * 100);
                        const isSelected = selectedItemName === m.name;
                        return (
                          <tr key={m.name} className={`group transition-all duration-300 ${isSelected ? 'bg-blue-600/10' : 'hover:bg-white/5'}`}>
                            <td className="px-8 py-6">
                              <button 
                                onClick={() => {
                                  setSelectedItemName(m.name);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={`font-black text-lg transition-all text-left ${isSelected ? 'text-blue-400' : 'text-slate-200 group-hover:text-blue-300'}`}
                              >
                                {m.name}
                              </button>
                              {isSelected && <div className="text-[10px] text-blue-500 mt-1 font-black uppercase tracking-tighter">檢視中</div>}
                            </td>
                            <td className="px-8 py-6 text-center">
                              <span className="bg-slate-900/80 px-4 py-2 rounded-xl font-mono font-black text-blue-400 border border-white/5 shadow-inner">{m.required}</span>
                            </td>
                             <td className="px-8 py-6">
                              <div className="flex items-center gap-2">
                                <button onClick={() => updateGathered(i, -1)} className="w-10 h-10 bg-slate-800/80 hover:bg-red-500/20 rounded-xl text-slate-400 hover:text-red-400 border border-white/5 transition-all font-black text-lg">-</button>
                                <input 
                                  type="number" 
                                  value={m.gathered}
                                  onChange={(e) => handleUpdate(m.name, parseInt(e.target.value) || 0, i)}
                                  className="w-20 bg-slate-950/50 border border-white/10 rounded-xl text-center font-black text-xl text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <button onClick={() => updateGathered(i, 1)} className="w-10 h-10 bg-slate-800/80 hover:bg-green-500/20 rounded-xl text-slate-400 hover:text-green-400 border border-white/5 transition-all font-black text-lg">+</button>
                                <button onClick={() => updateGathered(i, 10)} className="px-3 h-10 bg-slate-800/80 hover:bg-blue-500/20 rounded-xl text-slate-400 hover:text-blue-400 border border-white/5 text-[10px] font-black transition-all">+10</button>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="w-full">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter mb-2.5 text-slate-500">
                                  <span>Efficiency</span>
                                  <span className={percent >= 100 ? 'text-green-400' : 'text-blue-400'}>{percent}%</span>
                                </div>
                                <div className="w-full bg-slate-900/80 h-3 rounded-full overflow-hidden border border-white/5 p-[2px]">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-700 ease-out ${percent >= 100 ? 'bg-gradient-to-r from-emerald-600 to-green-400 shadow-[0_0_12px_rgba(52,211,153,0.4)]' : 'bg-gradient-to-r from-blue-700 to-cyan-500 shadow-[0_0_12px_rgba(59,130,246,0.4)]'}`} 
                                    style={{ width: `${Math.min(100, percent)}%` }}
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
          </div>

          {/* Side Detail Column */}
          <div className="lg:col-span-4 sticky top-10">
            {selectedItemName ? (
              <div className="bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white/10 shadow-4xl animate-in fade-in slide-in-from-right-10 duration-500 ring-1 ring-blue-500/20">
                <ItemDetailView 
                  itemName={selectedItemName} 
                  onBack={() => setSelectedItemName(null)} 
                />
              </div>
            ) : (
              <div className="h-[600px] bg-slate-900/20 backdrop-blur-md rounded-[2.5rem] p-12 border border-white/5 border-dashed flex flex-col items-center justify-center text-slate-600 group transition-all duration-500 hover:border-blue-500/20">
                <div className="w-20 h-20 rounded-3xl bg-slate-800/40 flex items-center justify-center mb-8 border border-white/5 group-hover:scale-110 group-hover:rotate-12 transition-all">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 opacity-30 group-hover:opacity-100 group-hover:text-blue-500 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                   </svg>
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-2 text-slate-500">準備面板</h3>
                <p className="text-[11px] font-bold text-center leading-relaxed">
                  點擊清單中的材料名稱<br/>
                  即可在此預覽製作配方與地圖導覽
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmarineGathering;
