import React, { useState, useEffect } from 'react';
import { Search, Loader2, Database } from 'lucide-react';

const SearchItem = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cachedItems, setCachedItems] = useState([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  // 初次進網頁時「偷偷」把整包幾萬筆物品的資料載下來
  useEffect(() => {
    let mounted = true;
    
    const initializeCache = async () => {
      try {
        const res = await fetch('https://cycleapple.github.io/ffxiv-item-search-tc/data/items.json');
        if (!res.ok) throw new Error('無法取得物品資料快取');
        
        const data = await res.json();
        
        // items.json 的真實結構是 { "items": { "1": { ... }, "2": { ... } } }
        // 我們只需要取出所有的 value 變成陣列即可
        let allItems = [];
        if (data.items) {
          allItems = Object.values(data.items);
        } else {
          // Fallback 以防萬一
          allItems = Object.values(data);
        }
        
        if (mounted) {
          setCachedItems(allItems);
          setIsInitializing(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || '發生未知錯誤');
          setIsInitializing(false);
        }
      }
    };

    initializeCache();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim() || cachedItems.length === 0) return;

    setError(null);
    const term = searchTerm.toLowerCase();
    
    // 精準搜尋：我們找物品的所有「名稱」相關欄位包含關鍵字的（如 name, name_tc, name_chs 等）
    const filtered = cachedItems.filter(item => {
      if (!item) return false;
      
      for (const key of Object.keys(item)) {
        if (key.toLowerCase().includes('name')) {
          const val = item[key];
          if (typeof val === 'string' && val.toLowerCase().includes(term)) {
            return true;
          }
        }
      }
      return false;
    });

    // 依據需求，結果只保留 id 與 name
    const simplifiedResults = filtered.map(item => ({
      id: item.id,
      name: item.name
    }));

    // 為避免畫面卡頓，我們只顯示前 50 筆結果
    setResults(simplifiedResults.slice(0, 50));
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
        <div className="bg-white p-10 rounded-2xl shadow-2xl flex flex-col items-center max-w-md w-full border border-slate-100 animate-in zoom-in duration-500">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-75"></div>
            <div className="relative bg-indigo-600 text-white p-4 rounded-full shadow-lg">
              <Database size={40} className="animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">建立快取中...</h2>
          <p className="text-slate-500 text-center text-sm leading-relaxed">
            正在背景為您下載超過 40,000 筆 FF14 物品資料。<br />
            （這是達成零延遲「秒搜」的秘密武器！）
          </p>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-8 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full w-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 搜尋區塊 */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <Search className="text-indigo-600" size={32} />
              查找物品
            </h1>
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-sm font-bold border border-emerald-200">
              <Database size={16} />
              已快取 {cachedItems.length.toLocaleString()} 筆資料
            </div>
          </div>
          
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="請輸入精確的物品名稱 (例如：水族箱)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
            />
            <button
              type="submit"
              disabled={!searchTerm.trim()}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg whitespace-nowrap"
            >
              <Search size={24} />
              瞬間搜尋
            </button>
          </form>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 font-medium">
              {error}
            </div>
          )}
        </div>

        {/* 結果顯示區塊 (JSON) */}
        {results && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center justify-between">
              搜尋結果 (原始 JSON 資料)
              <span className="text-sm font-normal text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                精準篩選：顯示 {results.length} 筆
              </span>
            </h2>
            <div className="bg-slate-900 rounded-xl p-6 overflow-x-auto shadow-inner">
              <pre className="text-emerald-400 text-sm font-mono leading-relaxed">
                {results.length > 0 
                  ? JSON.stringify(results, null, 2)
                  : "沒有找到名稱完全包含這個關鍵字的物品！"}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchItem;
