import { useState, useEffect } from 'react';
import { Search, Loader2, Database, Box, MapPin, Pickaxe } from 'lucide-react';

const SearchItem = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cachedItems, setCachedItems] = useState([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [gatheringData, setGatheringData] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);

  // 初次進網頁時「偷偷」把整包幾萬筆物品的資料載下來
  useEffect(() => {
    let mounted = true;
    
    const initializeCache = async () => {
      try {
        const [itemsRes, gatheringRes] = await Promise.all([
          fetch('/data/items.json'),
          fetch('/data/gathering.json')
        ]);
        if (!itemsRes.ok || !gatheringRes.ok) throw new Error('無法取得物品或採集資料快取');
        
        const data = await itemsRes.json();
        const gathering = await gatheringRes.json();
        
        // items.json 的真實結構是 { "items": { "1": { ... }, "2": { ... } } }
        let allItems = [];
        if (data.items) {
          allItems = Object.values(data.items);
        } else {
          allItems = Object.values(data);
        }
        
        if (mounted) {
          setCachedItems(allItems);
          setGatheringData(gathering.points || {});
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

        {/* 結果顯示區塊 (排版列表) */}
        {results && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
              搜尋結果
              <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100 shadow-sm">
                共找到 {results.length} 個物品
              </span>
            </h2>
            
            {results.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {results.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  const nodes = gatheringData[item.id] || [];
                  
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => setSelectedItem(isSelected ? null : item)}
                      className={`group flex items-center gap-5 p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-50 border-indigo-300 shadow-md ring-1 ring-indigo-200' 
                          : 'bg-slate-50 border-slate-200 hover:bg-white hover:shadow-xl hover:border-indigo-300 transform hover:-translate-y-1'
                      }`}
                    >
                      <div className={`bg-white p-3.5 rounded-xl shadow-sm border transition-colors overflow-hidden ${isSelected ? 'border-indigo-400 bg-indigo-100' : 'border-slate-200 group-hover:border-indigo-400 group-hover:bg-indigo-50'}`}>
                        <Box className={`${isSelected ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-600'} transition-colors drop-shadow-sm`} size={28} />
                      </div>
                      
                      <div className="flex-grow">
                        <h3 className={`text-xl font-black transition-colors tracking-wide ${isSelected ? 'text-indigo-800' : 'text-slate-700 group-hover:text-indigo-700'}`}>
                          {item.name}
                        </h3>
                        
                        {/* 展開詳情區塊 */}
                        {isSelected && (
                          <div className="mt-4 pt-4 border-t border-indigo-200 animate-in slide-in-from-top-2 fade-in duration-300">
                            <h4 className="flex items-center gap-2 text-sm font-bold text-indigo-700 mb-3">
                              <Pickaxe size={16} /> 採集地點 / 來源
                            </h4>
                            
                            {nodes.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {nodes.map((node, i) => (
                                  <div key={node.id || i} className="bg-white rounded-xl p-4 border border-indigo-100 shadow-sm flex flex-col gap-2 relative overflow-hidden">
                                     <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-xl"></div>
                                     <div className="flex items-center gap-2 font-bold text-slate-800 pl-2">
                                       <MapPin size={16} className="text-indigo-500" />
                                       <span>{node.placeName}</span>
                                     </div>
                                     <div className="flex items-center gap-3 text-sm pl-2">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium border border-slate-200">
                                          X:{node.x} , Y:{node.y}
                                        </span>
                                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-black border border-emerald-200 tracking-wide">
                                          Lv.{node.level} {node.stars && <span className="text-amber-500 ml-1">{node.stars}</span>}
                                        </span>
                                     </div>
                                     <div className="text-xs text-slate-400 pl-2 mt-1">
                                       {node.gatheringTypeName}
                                     </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="bg-white rounded-xl p-4 border border-indigo-100 shadow-sm text-center">
                                <span className="text-slate-500 font-medium text-sm">此物品目前沒有紀錄採集地點，或是需要透過製作/交換取得。</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {!isSelected && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity min-w-[80px]">
                          <div className="text-sm font-black text-indigo-600 bg-indigo-100 px-4 py-2 rounded-full text-center hover:bg-indigo-200 hover:text-indigo-800 transition-colors shadow-sm">
                            查看地點
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 bg-slate-50 rounded-2xl border-2 border-slate-200 border-dashed">
                <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                  <Box className="text-slate-300" size={48} />
                </div>
                <p className="text-slate-600 font-bold text-lg">沒有找到名稱完全包含這個關鍵字的物品！</p>
                <p className="text-slate-400 text-sm mt-2 font-medium">請嘗試更換其他關鍵字，或是輸入部分名稱看看</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchItem;
