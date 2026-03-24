import { useState, useEffect } from 'react';
import { Search, Database, Box, MapPin, Pickaxe, Hammer, ChevronRight, ChevronLeft, ShoppingBag, Trash2, Plus } from 'lucide-react';

const SearchItem = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cachedItems, setCachedItems] = useState([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [gatheringData, setGatheringData] = useState({});
  const [recipeData, setRecipeData] = useState({});
  const [mapData, setMapData] = useState({});
  const [itemsMap, setItemsMap] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedMapNode, setSelectedMapNode] = useState(null);
  const [expandedIngredients, setExpandedIngredients] = useState(new Set());
  const [history, setHistory] = useState([]);
  const [expandedTrackerItems, setExpandedTrackerItems] = useState(new Set());
  const [trackedItems, setTrackedItems] = useState(() => {
    const saved = localStorage.getItem('ff14-tracked-items');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const [itemsRes, gatheringRes, recipesRes, mapsRes] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}data/items.json`),
          fetch(`${import.meta.env.BASE_URL}data/gathering.json`),
          fetch(`${import.meta.env.BASE_URL}data/recipes.json`),
          fetch(`${import.meta.env.BASE_URL}data/zone-maps.json`),
        ]);
        if (!itemsRes.ok || !gatheringRes.ok || !recipesRes.ok || !mapsRes.ok)
          throw new Error('無法取得資料');
        const data = await itemsRes.json();
        const gathering = await gatheringRes.json();
        const recipes = await recipesRes.json();
        const maps = await mapsRes.json();
        const allItems = Object.values(data.items || data);
        if (mounted) {
          setCachedItems(allItems);
          setItemsMap(data.items || {});
          setGatheringData(gathering.points || {});
          setRecipeData(recipes.recipes || {});
          
          // Pre-index maps by ID for faster lookup
          const mapsById = {};
          if (maps.maps) {
            Object.entries(maps.maps).forEach(([name, m]) => {
              if (m.id) mapsById[m.id] = { ...m, zoneName: name };
            });
          }
          setMapData(mapsById);
          
          // Check URL for selected item (HashRouter support)
          const hash = window.location.hash;
          const queryStr = hash.includes('?') ? hash.split('?')[1] : '';
          const params = new URLSearchParams(queryStr);
          const selectedId = params.get('selected');
          if (selectedId && data.items && data.items[selectedId]) {
            setSelectedItem(data.items[selectedId]);
          }
          
          setIsInitializing(false);
        }
      } catch (err) {
        if (mounted) { setError(err.message); setIsInitializing(false); }
      }
    };
    init();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    localStorage.setItem('ff14-tracked-items', JSON.stringify(trackedItems));
  }, [trackedItems]);

  const handleAddToTracker = (item, amount = 1) => {
    setTrackedItems(prev => {
      let nextList;
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        nextList = prev.map(i => i.id === item.id ? { ...i, amount: i.amount + amount } : i);
      } else {
        nextList = [...prev, { id: item.id, name: item.name, amount }];
      }

      // ── Sorting Logic ──
      // Group by mapId, then secondary sort by name
      const getSortKey = (id) => {
        const nodes = gatheringData[String(id)] || [];
        return nodes.length > 0 ? (nodes[0].mapId || 999999) : 999999;
      };

      return [...nextList].sort((a, b) => {
        const keyA = getSortKey(a.id);
        const keyB = getSortKey(b.id);
        if (keyA !== keyB) return keyA - keyB;
        return a.name.localeCompare(b.name, 'zh-Hant');
      });
    });
  };

  const handleRemoveFromTracker = (itemId) => {
    setTrackedItems(prev => prev.filter(i => i.id !== itemId));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim() || cachedItems.length === 0) return;
    setSelectedItem(null);
    const term = searchTerm.toLowerCase();
    const filtered = cachedItems.filter(item => {
      if (!item) return false;
      for (const key of Object.keys(item)) {
        if (key.toLowerCase().includes('name')) {
          const val = item[key];
          if (typeof val === 'string' && val.toLowerCase().includes(term)) return true;
        }
      }
      return false;
    });
    setResults(filtered.slice(0, 50));
  };

  // ── Recursive ingredient tree ─────────────────────────────────
  const resolveTree = (ingredients, depth = 0, visited = new Set()) =>
    (ingredients || []).map(ing => {
      const ingId = String(ing.itemId);
      const name = itemsMap[ingId]?.name || `#${ingId}`;
      const subRecipes = recipeData[ingId];
      const hasSubRecipe = subRecipes?.length > 0 && !visited.has(ingId);
      const children = hasSubRecipe
        ? resolveTree(subRecipes[0].ingredients || [], depth + 1, new Set([...visited, ingId]))
        : [];
      return { id: ingId, name, amount: ing.amount, children, depth };
    });

  const depthColors = [
    'border-amber-400 bg-amber-50 text-amber-900',
    'border-sky-400 bg-sky-50 text-sky-900',
    'border-emerald-400 bg-emerald-50 text-emerald-900',
    'border-purple-400 bg-purple-50 text-purple-900',
  ];

  // ── Loading screen ────────────────────────────────────────────
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white p-10 rounded-2xl shadow-xl flex flex-col items-center gap-5 max-w-sm w-full">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-75" />
            <div className="relative bg-indigo-600 text-white p-4 rounded-full">
              <Database size={36} className="animate-pulse" />
            </div>
          </div>
          <h2 className="text-xl font-black text-slate-800">建立快取中...</h2>
          <p className="text-slate-400 text-sm text-center">正在下載 FF14 物品資料庫，完成後即可秒搜</p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full w-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ── Map Coordinate Conversion ────────────────────────────────
  const getMarkerPos = (coord, sizeFactor) => {
    // Formula from research: percentage = (coord - 1) / (41 / (sizeFactor / 100)) * 100
    // Simplified: (coord - 1) * (sizeFactor / 41)
    const pos = (coord - 1) * (sizeFactor / 41);
    return `${pos}%`;
  };

  const handleBack = () => {
    setHistory(prev => {
      const newHistory = [...prev];
      const previousItem = newHistory.pop();
      if (previousItem) {
        setSelectedItem(previousItem);
      }
      return newHistory;
    });
  };

  const toggleIngredientMap = (nodeKey) => {
    setExpandedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(nodeKey)) next.delete(nodeKey);
      else next.add(nodeKey);
      return next;
    });
  };

  const toggleTrackerMap = (itemId) => {
    setExpandedTrackerItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const renderMiniMap = (itemId, nodes) => {
    if (!nodes || nodes.length === 0) return null;
    const firstNode = nodes[0];
    const miniMapInfo = mapData[firstNode.mapId];
    if (!miniMapInfo) return null;

    return (
      <div className="mx-2 my-2 bg-white border border-slate-200 rounded-lg p-2 shadow-sm animate-in zoom-in-95 duration-200">
        <div className="text-[10px] font-black text-indigo-600 mb-1 flex items-center justify-between">
          <span className="truncate mr-2">
            {miniMapInfo.zoneName ? `${miniMapInfo.zoneName} - ` : ''}{firstNode.placeName} (Lv.{firstNode.level})
          </span>
          <span className="shrink-0">X:{firstNode.x}, Y:{firstNode.y}</span>
        </div>
        <div className="relative aspect-video w-full bg-slate-100 rounded overflow-hidden border border-slate-200">
          <img 
            src={`https://xivapi.com/m/${miniMapInfo.path}.jpg`} 
            alt={firstNode.placeName}
            className="w-full h-full object-cover opacity-90"
          />
          <div 
            className="absolute w-2 h-2 bg-red-600 rounded-full border border-white shadow-sm z-10 translate-x-[-50%] translate-y-[-50%]"
            style={{ 
              left: getMarkerPos(firstNode.x, miniMapInfo.sizeFactor), 
              top: getMarkerPos(firstNode.y, miniMapInfo.sizeFactor) 
            }}
          />
        </div>
      </div>
    );
  };

  const renderNode = (node) => {
    const nodeKey = `${node.id}-${node.depth}`;
    const isExpanded = expandedIngredients.has(nodeKey);
    const ingredientNodes = gatheringData[node.id] || [];
    const hasGathering = ingredientNodes.length > 0;

    return (
      <div key={nodeKey} className="flex flex-col gap-0.5">
        <div 
          onClick={() => hasGathering && toggleIngredientMap(nodeKey)}
          className={`flex items-center justify-between px-3 py-1.5 rounded-lg border-l-4 text-sm transition-all ${
            depthColors[node.depth % depthColors.length]
          } ${hasGathering ? 'cursor-pointer hover:brightness-95 active:scale-[0.98]' : 'cursor-default'}`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <span 
              className="font-semibold truncate"
              title={node.name}
            >
              {node.name}
            </span>
            {hasGathering && (
              <MapPin size={10} className={`${isExpanded ? 'text-red-500' : 'text-slate-400'} shrink-0`} />
            )}
            {itemsMap[node.id] && (
              <div className="flex items-center gap-1 ml-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setHistory(prev => [...prev, selectedItem]);
                    setSelectedItem(itemsMap[node.id]);
                  }}
                  className="p-1 rounded-md hover:bg-slate-200 text-slate-300 hover:text-indigo-500 transition-colors"
                  title="查看完整物品資訊"
                >
                  <ChevronRight size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToTracker(itemsMap[node.id], node.amount);
                  }}
                  className="p-1 rounded-md hover:bg-emerald-100 text-slate-300 hover:text-emerald-600 transition-colors"
                  title="加入追蹤清單"
                >
                  <ShoppingBag size={12} />
                </button>
              </div>
            )}
          </div>
          <span className="ml-3 font-black opacity-60 shrink-0">×{node.amount}</span>
        </div>

        {/* 迷你地圖顯示 */}
        {isExpanded && hasGathering && renderMiniMap(node.id, ingredientNodes)}

        {node.children.length > 0 && (
          <div className="ml-5 flex flex-col gap-0.5 border-l-2 border-slate-200 pl-3 mt-0.5">
            {node.children.map(renderNode)}
          </div>
        )}
      </div>
    );
  };

  // ── Detail panel ──────────────────────────────────────────────
  const renderDetail = () => {
    if (!selectedItem) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-4 py-20">
          <Box size={64} strokeWidth={1} />
          <p className="font-medium text-lg">點擊左側物品查看詳情</p>
        </div>
      );
    }

    const id = String(selectedItem.id);
    const nodes = gatheringData[id] || [];
    const recipes = recipeData[id] || [];

    return (
      <div className="flex flex-col gap-6">
        {history.length > 0 && (
          <button 
            onClick={handleBack}
            className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors mb-2 self-start bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-full shadow-sm border border-slate-200"
          >
            <ChevronLeft size={16} />
            返回 {history[history.length - 1].name}
          </button>
        )}
        {/* 物品名稱 */}
        <div className="border-b border-slate-200 pb-4 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-black text-slate-800">{selectedItem.name}</h2>
            <p className="text-xs text-slate-400 mt-1">ID: {selectedItem.id}</p>
          </div>
          <button
            onClick={() => handleAddToTracker(selectedItem, 1)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95"
          >
            <ShoppingBag size={16} />
            追蹤此物品
          </button>
        </div>

        {/* 採集地點 */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black text-indigo-700 uppercase tracking-wide mb-3">
            <Pickaxe size={15} /> 採集地點
          </h3>
          {nodes.length > 0 ? (
            <div className="flex flex-col gap-3">
              {nodes.map((node, i) => {
                const mapInfo = mapData[node.mapId];
                const isMapVisible = selectedMapNode === `${node.id}-${i}`;
                
                return (
                  <div key={node.id || i} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div 
                      onClick={() => setSelectedMapNode(isMapVisible ? null : `${node.id}-${i}`)}
                      className={`p-4 cursor-pointer flex flex-col gap-1 relative ${isMapVisible ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-slate-800 pl-2 text-sm">
                          <MapPin size={13} className="text-indigo-500 shrink-0" />
                          {mapInfo?.zoneName ? `${mapInfo.zoneName} - ` : ''}{node.placeName}
                        </div>
                        <div className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">
                          {isMapVisible ? '隱藏地圖' : '顯示地圖'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pl-2 flex-wrap">
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-black border border-indigo-200">
                          X:{node.x} , Y:{node.y}
                        </span>
                        <span className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded font-black">
                          Lv.{node.level}{node.stars ? ` ${'★'.repeat(node.stars)}` : ''}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">{node.gatheringTypeName}</span>
                      </div>
                    </div>

                    {/* 地圖顯示區 */}
                    {isMapVisible && mapInfo && (
                      <div className="border-t border-indigo-100 bg-slate-50 p-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="relative aspect-square w-full max-w-[400px] mx-auto bg-slate-200 rounded-lg shadow-inner overflow-hidden border-2 border-white">
                          <img 
                            src={`https://xivapi.com/m/${mapInfo.path}.jpg`} 
                            alt={node.placeName}
                            className="w-full h-full object-cover"
                          />
                          {/* 紅點標記 */}
                          <div 
                            className="absolute w-3 h-3 bg-red-600 rounded-full border-2 border-white shadow-[0_0_10px_rgba(220,38,38,0.8)] z-10 translate-x-[-50%] translate-y-[-50%] animate-pulse"
                            style={{ 
                              left: getMarkerPos(node.x, mapInfo.sizeFactor), 
                              top: getMarkerPos(node.y, mapInfo.sizeFactor) 
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">
                          數據來源: XIVAPI | 地圖倍率: {mapInfo.sizeFactor}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 bg-slate-50 rounded-xl p-3 text-center">此物品無法採集</p>
          )}
        </div>

        {/* 製作配方 */}
        {recipes.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-sm font-black text-amber-700 uppercase tracking-wide mb-3">
              <Hammer size={15} /> 製作配方
            </h3>
            <div className="flex flex-col gap-4">
              {recipes.map((recipe, ri) => {
                const tree = resolveTree(recipe.ingredients || []);
                return (
                  <div key={recipe.id || ri} className="bg-white border border-amber-200 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-400 rounded-l-xl" />
                    <div className="flex items-center gap-2 mb-3 pl-2">
                      <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-black text-xs border border-amber-300">
                        {recipe.craftTypeName}
                      </span>
                      <span className="text-xs text-slate-400">Lv.{recipe.recipeLevel} → ×{recipe.resultAmount}</span>
                    </div>
                    <div className="flex flex-col gap-1 pl-2">
                      {tree.map(renderNode)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTracker = () => {
    return (
      <div className="h-full flex flex-col bg-slate-50 border-l border-slate-200 w-72 shrink-0 overflow-hidden">
        <header className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-black text-slate-700 uppercase tracking-wide">
            <ShoppingBag size={16} className="text-emerald-500" /> 追蹤清單
          </h3>
          {trackedItems.length > 0 && (
            <button 
              onClick={() => setTrackedItems([])}
              className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase"
            >
              全部清除
            </button>
          )}
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {trackedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-3">
              <Plus size={32} strokeWidth={1} />
              <p className="text-xs text-center px-4">點擊材料旁的 <ShoppingBag size={10} className="inline" /> <br/>即可加入追蹤</p>
            </div>
          ) : (
            trackedItems.map(item => {
              const nodes = gatheringData[String(item.id)] || [];
              const hasMap = nodes.length > 0;
              const isExpanded = expandedTrackerItems.has(item.id);

              return (
                <div key={item.id} className="bg-white border border-slate-200 rounded-lg shadow-sm group animate-in fade-in slide-in-from-right-2 duration-300 overflow-hidden">
                  <div 
                    onClick={() => hasMap && toggleTrackerMap(item.id)}
                    className={`p-3 transition-colors ${hasMap ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-1.5 truncate flex-1">
                        <span 
                          className="text-xs font-bold text-slate-700 truncate hover:text-indigo-600 hover:underline cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (itemsMap[item.id]) setSelectedItem(itemsMap[item.id]);
                          }}
                        >
                          {item.name}
                        </span>
                        {hasMap && (
                          <MapPin size={10} className={`${isExpanded ? 'text-red-500' : 'text-slate-400'} shrink-0`} />
                        )}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromTracker(item.id);
                        }}
                        className="text-slate-300 hover:text-red-500 transition-colors ml-2"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium tracking-tight">ID: {item.id}</span>
                      <div className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-100">
                        ×{item.amount}
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && hasMap && (
                    <div className="border-t border-slate-100 bg-slate-50/50 pb-1">
                      {renderMiniMap(item.id, nodes)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        
        {trackedItems.length > 0 && (
          <div className="p-4 bg-white border-t border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-500">待收集項目</span>
              <span className="text-xs font-black text-indigo-600">{trackedItems.length}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Main layout ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <div className="bg-indigo-600 p-1.5 rounded-lg text-white"><Search size={18} /></div>
        <span className="font-black text-slate-800 text-lg">FF14 物品查詢</span>
        <div className="ml-auto text-xs text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full font-bold border border-emerald-200">
          <Database size={12} className="inline mr-1" />{cachedItems.length.toLocaleString()} 筆已快取
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 57px)' }}>
        {/* ── Left panel ── */}
        <div className="w-72 shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
          {/* Search form */}
          <form onSubmit={handleSearch} className="p-4 border-b border-slate-100">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="輸入物品名稱..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex-grow text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!searchTerm.trim()}
                className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 shrink-0"
              >
                <Search size={16} />
              </button>
            </div>
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          </form>

          {/* Results list */}
          <div className="flex-1 overflow-y-auto">
            {results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-300 gap-3">
                <Box size={40} strokeWidth={1} />
                <p className="text-sm">搜尋以顯示結果</p>
              </div>
            )}
            {results.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setHistory([]);
                  setSelectedItem(item);
                }}
                className={`w-full text-left px-4 py-3 flex items-center justify-between border-b border-slate-100 hover:bg-indigo-50 transition-colors group ${selectedItem?.id === item.id ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent'}`}
              >
                <span className={`text-sm font-medium ${selectedItem?.id === item.id ? 'text-indigo-700 font-bold' : 'text-slate-700'}`}>
                  {item.name}
                </span>
                <ChevronRight size={14} className={`shrink-0 transition-colors ${selectedItem?.id === item.id ? 'text-indigo-500' : 'text-slate-300 group-hover:text-indigo-400'}`} />
              </button>
            ))}
          </div>
        </div>

        {/* ── Middle panel ── */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="max-w-2xl mx-auto">
            {renderDetail()}
          </div>
        </div>

        {/* ── Right panel (Tracker) ── */}
        {renderTracker()}
      </div>
    </div>
  );
};

export default SearchItem;
