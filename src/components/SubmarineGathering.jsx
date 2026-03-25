import React, { useState, useEffect } from 'react';
import submarineData from '../data/submarine_materials.json';
import ItemDetailView from './ItemDetailView';
import { decomposeMaterials } from '../utils/submarineMaterialDecomposer';
import { dataService } from '../utils/dataService';
import { Sun, Moon, Trash2 } from 'lucide-react';

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
  const [hideCompleted, setHideCompleted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('submarine_theme') !== 'light');

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

  // Initial fetch from DataService
  useEffect(() => {
    const initData = async () => {
      const counts = await dataService.fetchAllCounts();
      setSupabaseCounts(counts);
    };
    initData();

    // Subscribe to real-time changes
    const unsubscribe = dataService.subscribe((name, count) => {
      setSupabaseCounts(prev => ({
        ...prev,
        [name]: count
      }));
    });

    return unsubscribe;
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('submarine_theme', newMode ? 'dark' : 'light');
  };

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

  const updateGathered = async (name, delta) => {
    const material = materials.find(m => m.name === name);
    if (!material) return;

    const newGathered = Math.max(0, Math.min(material.required, material.gathered + delta));
    handleUpdate(name, newGathered);
  };

  const handleUpdate = async (name, value) => {
    // Update local state immediately for UI responsiveness
    setMaterials(prev => prev.map((m) => m.name === name ? { ...m, gathered: value } : m));

    // Update via DataService
    await dataService.updateCount(name, value);
  };

  const resetAllCounts = async () => {
    if (!window.confirm('確定要將所有材料收集數量重置為 0 嗎？')) return;
    
    setLoading(true);
    try {
      const updates = materials.map(m => ({ name: m.name, count: 0 }));
      const { success, error } = await dataService.bulkUpdate(updates);
      
      if (!success) throw error;

      // Update local cache
      setSupabaseCounts(prev => {
        const next = { ...prev };
        materials.forEach(m => { next[m.name] = 0; });
        return next;
      });
      
      alert('所有進度已清零');
    } catch (err) {
      console.error('Reset error:', err);
      alert('清零失敗: ' + (err.message || '未知錯誤'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen w-full font-sans relative overflow-x-hidden transition-colors duration-500 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Premium Background Elements */}
      <div className={`fixed inset-0 -z-10 transition-all duration-700 ${isDarkMode ? 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black' : 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-white to-slate-100'}`}></div>
      {isDarkMode && <div className="fixed inset-0 -z-10 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>}
      <div className={`fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] -z-10 animate-pulse ${isDarkMode ? 'bg-blue-600/10' : 'bg-blue-200/40'}`}></div>
      <div className={`fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] -z-10 animate-pulse delay-700 ${isDarkMode ? 'bg-cyan-600/10' : 'bg-cyan-200/40'}`}></div>

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
              onClick={toggleTheme}
              className={`p-3 rounded-2xl border transition-all duration-300 flex items-center gap-2 font-bold text-sm ${isDarkMode ? 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              {isDarkMode ? '日間模式' : '夜間模式'}
            </button>

            <button 
              onClick={() => setShowConfig(!showConfig)}
              className={`p-3 rounded-2xl border transition-all duration-300 flex items-center gap-2 font-bold text-sm ${showConfig ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : isDarkMode ? 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white backdrop-blur-md' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}
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
              onClick={() => setHideCompleted(!hideCompleted)}
              className={`p-3 px-6 rounded-2xl border transition-all duration-300 flex items-center gap-2 font-black text-sm backdrop-blur-md ${hideCompleted ? 'bg-orange-600 border-orange-400 text-white shadow-[0_0_15px_rgba(234,88,12,0.5)]' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'}`}
            >
              {hideCompleted ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057 5.064-7 9.542-7 1.254 0 2.413.245 3.473.691M15.011 7.228A4 4 0 0115 12h-4m9.37 7.37L21 21m-2-2l-2-2m-1.37-1.37A10.012 10.012 0 0112 17c-1.254 0-2.413-.245-3.472-.691" />
                </svg>
              )}
              {hideCompleted ? '顯示已完成' : '隱藏已完成'}
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
          <div className={`${isDarkMode ? 'bg-slate-900/60' : 'bg-white/80'} backdrop-blur-xl p-6 rounded-3xl mb-10 border ${isDarkMode ? 'border-blue-500/30' : 'border-blue-200'} shadow-[0_10px_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-top duration-300`}>
            <h2 className={`text-lg font-black mb-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} flex items-center gap-2 uppercase tracking-widest`}>
              <span className={`w-2 h-2 ${isDarkMode ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]' : 'bg-blue-600'} rounded-full animate-pulse`}></span>
              數據服務配置 (目前模式: {import.meta.env.VITE_DB_ADAPTER || 'supabase'})
            </h2>
            <div className="flex flex-wrap gap-4">
              <input 
                type="text" 
                className={`flex-1 min-w-[300px] p-4 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200 text-slate-900'} rounded-2xl border outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-mono text-sm`}
                placeholder="Apps Script URL (Legacy Support)"
                value={spreadsheetUrl}
                onChange={(e) => setSpreadsheetUrl(e.target.value)}
              />
              <button onClick={fetchSpreadsheetData} className={`${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'} px-8 py-4 rounded-2xl font-black border transition-all active:scale-95`}>自雲端拉取 (GAS)</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Main Content Column */}
          <div className="lg:col-span-8 space-y-10">
            {/* Component Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {partTypes.map(part => (
                <div key={part} className={`group ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200'} backdrop-blur-md p-5 rounded-3xl border hover:border-blue-500/40 transition-all duration-500 shadow-xl`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <label className={`block text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-[0.2em] group-hover:text-blue-400 transition-colors`}>{part}</label>
                  </div>
                  <select 
                    className={`w-full ${isDarkMode ? 'bg-slate-800/50 border-slate-700/50 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'} p-4 rounded-2xl border outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer font-bold`}
                    value={selectedParts[part]}
                    onChange={(e) => setSelectedParts({...selectedParts, [part]: e.target.value})}
                  >
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Materials Summary Table */}
            <div className={`${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'} backdrop-blur-md rounded-[2.5rem] overflow-hidden border shadow-3xl`}>
              <div className={`p-8 border-b ${isDarkMode ? 'border-white/5' : 'border-slate-100'} flex justify-between items-center bg-gradient-to-r ${isDarkMode ? 'from-slate-900/50' : 'from-slate-50/50'} to-transparent`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'} flex items-center justify-center border`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    <tr className={`${isDarkMode ? 'text-slate-500 bg-slate-950/30' : 'text-slate-400 bg-slate-50'} text-[10px] font-black uppercase tracking-[0.2em]`}>
                      <th className="px-8 py-5">素材名稱 (關鍵字)</th>
                      <th className="px-8 py-5 text-center">總需求</th>
                      <th className="px-8 py-5">快速更新</th>
                      <th className="px-8 py-5 min-w-[200px]">蒐集狀態</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                    {materials.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-8 py-20 text-center text-slate-600 font-bold italic">
                          等待資料載入或尚未選擇部位...
                        </td>
                      </tr>
                    ) : (
                      materials
                        .filter(m => !hideCompleted || m.gathered < m.required)
                        .map((m) => {
                          const percent = Math.round((m.gathered / m.required) * 100);
                          const isSelected = selectedItemName === m.name;
                          return (
                            <tr key={m.name} className={`group transition-all duration-300 ${isSelected ? (isDarkMode ? 'bg-blue-600/10' : 'bg-blue-50') : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50')}`}>
                              <td className="px-8 py-6">
                                <button 
                                  onClick={() => {
                                    setSelectedItemName(m.name);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className={`font-black text-lg transition-all text-left ${isSelected ? 'text-blue-400' : (isDarkMode ? 'text-slate-200 group-hover:text-blue-300' : 'text-slate-700 group-hover:text-blue-600')}`}
                                >
                                  {m.name}
                                </button>
                                {isSelected && <div className={`text-[10px] ${isDarkMode ? 'text-blue-500' : 'text-blue-600'} mt-1 font-black uppercase tracking-tighter`}>檢視中</div>}
                              </td>
                              <td className="px-8 py-6 text-center">
                                <span className={`${isDarkMode ? 'bg-slate-900/80 border-white/5 text-blue-400' : 'bg-slate-100 border-slate-200 text-blue-700'} px-4 py-2 rounded-xl font-mono font-black border shadow-inner`}>{m.required}</span>
                              </td>
                               <td className="px-8 py-6">
                                <div className="flex items-center gap-2">
                                  <button onClick={() => updateGathered(m.name, -1)} className={`w-10 h-10 ${isDarkMode ? 'bg-slate-800/80 hover:bg-red-500/20 text-slate-400' : 'bg-slate-100 hover:bg-red-50 text-slate-500'} rounded-xl border border-white/5 transition-all font-black text-lg text-center hover:text-red-600`}>-</button>
                                  <input 
                                    type="number" 
                                    value={m.gathered}
                                    onChange={(e) => handleUpdate(m.name, parseInt(e.target.value) || 0)}
                                    className={`w-20 ${isDarkMode ? 'bg-slate-950/50 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} rounded-xl text-center font-black text-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                  />
                                  <button onClick={() => updateGathered(m.name, 1)} className={`w-10 h-10 ${isDarkMode ? 'bg-slate-800/80 hover:bg-green-500/20 text-slate-400' : 'bg-slate-100 hover:bg-green-50 text-slate-500'} rounded-xl border border-white/5 transition-all font-black text-lg text-center hover:text-green-600`}>+</button>
                                  <button onClick={() => updateGathered(m.name, 10)} className={`px-3 h-10 ${isDarkMode ? 'bg-slate-800/80 hover:bg-blue-500/20 text-slate-400' : 'bg-slate-100 hover:bg-blue-50 text-slate-500'} rounded-xl border border-white/5 text-[10px] font-black transition-all hover:text-blue-600`}>+10</button>
                                </div>
                              </td>
                            <td className="px-8 py-6">
                              <div className="w-full">
                                <div className={`flex justify-between text-[10px] font-black uppercase tracking-tighter mb-2.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                  <span>Efficiency</span>
                                  <span className={percent >= 100 ? 'text-green-400' : (isDarkMode ? 'text-blue-400' : 'text-blue-600')}>{percent}%</span>
                                </div>
                                <div className={`w-full ${isDarkMode ? 'bg-slate-900/80' : 'bg-slate-200'} h-3 rounded-full overflow-hidden border ${isDarkMode ? 'border-white/5' : 'border-slate-300'} p-[2px]`}>
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
              <div className={`${isDarkMode ? 'bg-slate-900/80 border-white/10 ring-blue-500/20 shadow-4xl' : 'bg-white border-slate-200 shadow-xl ring-blue-500/10'} backdrop-blur-2xl rounded-[2.5rem] p-8 border animate-in fade-in slide-in-from-right-10 duration-500 ring-1`}>
                <ItemDetailView 
                  itemName={selectedItemName} 
                  onBack={() => setSelectedItemName(null)} 
                  isDarkMode={isDarkMode}
                />
              </div>
            ) : (
              <div className={`h-[600px] ${isDarkMode ? 'bg-slate-900/20 border-white/5' : 'bg-slate-100/50 border-slate-200'} backdrop-blur-md rounded-[2.5rem] p-12 border border-dashed flex flex-col items-center justify-center text-slate-600 group transition-all duration-500 hover:border-blue-500/20`}>
                <div className={`w-20 h-20 rounded-3xl ${isDarkMode ? 'bg-slate-800/40 border-white/5' : 'bg-white border-slate-200 shadow-sm'} flex items-center justify-center mb-8 border group-hover:scale-110 group-hover:rotate-12 transition-all`}>
                   <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 opacity-30 group-hover:opacity-100 ${isDarkMode ? 'group-hover:text-blue-500' : 'group-hover:text-blue-600'} transition-all`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                   </svg>
                </div>
                <h3 className={`text-sm font-black uppercase tracking-[0.2em] mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>準備面板</h3>
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
