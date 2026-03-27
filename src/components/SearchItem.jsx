import { useState, useEffect, useMemo } from 'react';
import { Search, Database, Box, MapPin, Pickaxe, Hammer, ChevronRight, ChevronLeft, ShoppingBag, Trash2, Plus, Sun, Moon, Clock } from 'lucide-react';
import { getEorzeaTime, getSpawnStatus, formatRealTime } from '../utils/eorzeaTime';

const SearchItem = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cachedItems, setCachedItems] = useState([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [gatheringData, setGatheringData] = useState({});
  const [recipeData, setRecipeData] = useState({});
  const [sourcesData, setSourcesData] = useState({});
  const [mapData, setMapData] = useState({});
  const [itemsMap, setItemsMap] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedMapNode, setSelectedMapNode] = useState(null);
  const [selectedVendorMap, setSelectedVendorMap] = useState(null);
  const [expandedIngredients, setExpandedIngredients] = useState(new Set());
  const [history, setHistory] = useState([]);
  const [expandedTrackerItems, setExpandedTrackerItems] = useState(new Set());
  const [trackedItems, setTrackedItems] = useState(() => {
    const saved = localStorage.getItem('ff14-tracked-items');
    return saved ? JSON.parse(saved) : [];
  });
  const [et, setEt] = useState(getEorzeaTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setEt(getEorzeaTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const [itemsRes, gatheringRes, recipesRes, mapsRes, sourcesRes] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}data/items.json`),
          fetch(`${import.meta.env.BASE_URL}data/gathering.json`),
          fetch(`${import.meta.env.BASE_URL}data/recipes.json`),
          fetch(`${import.meta.env.BASE_URL}data/zone-maps.json`),
          fetch(`${import.meta.env.BASE_URL}data/sources.json`),
        ]);
        if (!itemsRes.ok || !gatheringRes.ok || !recipesRes.ok || !mapsRes.ok || !sourcesRes.ok)
          throw new Error('無法取得資料');
        const data = await itemsRes.json();
        const gathering = await gatheringRes.json();
        const recipes = await recipesRes.json();
        const maps = await mapsRes.json();
        const sources = await sourcesRes.json();
        const allItems = Object.values(data.items || data);
        if (mounted) {
          setCachedItems(allItems);
          setItemsMap(data.items || data);
          setGatheringData(gathering.points || gathering);
          setRecipeData(recipes.recipes || recipes);
          setSourcesData(sources.sources || sources);
          
          // Pre-index maps by ID and Name for faster lookup
          const mapsById = {};
          const mapsByName = {};
          if (maps.maps) {
            Object.entries(maps.maps).forEach(([name, m]) => {
              if (m.id) {
                const mapInfo = { ...m, zoneName: name };
                mapsById[m.id] = mapInfo;
                mapsByName[name] = mapInfo;
              }
            });
          }
          setMapData({ byId: mapsById, byName: mapsByName });
          
          // Check URL for selected item (HashRouter support)
          const hash = window.location.hash;
          const queryStr = hash.includes('?') ? hash.split('?')[1] : '';
          const params = new URLSearchParams(queryStr);
          const selectedId = params.get('selected');
          const searchQuery = params.get('q');
          
          const itemInfo = (data.items || data)[selectedId];
          if (selectedId && itemInfo) {
            setSelectedItem(itemInfo);
          } else if (searchQuery) {
            setSearchTerm(searchQuery);
            const term = searchQuery.toLowerCase();
            const filtered = allItems.filter(item => {
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
            if (filtered.length === 1) {
              setSelectedItem(filtered[0]);
            }
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
      if (typeof item.id === 'number' && String(item.id) === term) return true;
      if (typeof item.id === 'string' && item.id === term) return true;
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
    'border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-700/50',
    'border-sky-400 bg-sky-50 text-sky-900 dark:bg-sky-900/20 dark:text-sky-200 dark:border-sky-700/50',
    'border-emerald-400 bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-700/50',
    'border-purple-400 bg-purple-50 text-purple-900 dark:bg-purple-900/20 dark:text-purple-200 dark:border-purple-700/50',
  ];

  // ── Loading screen ────────────────────────────────────────────
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center transition-colors duration-300">
        <div className="bg-white dark:bg-slate-900 p-10 rounded-2xl shadow-xl flex flex-col items-center gap-5 max-w-sm w-full border dark:border-slate-800">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-100 dark:bg-indigo-900/30 rounded-full animate-ping opacity-75" />
            <div className="relative bg-indigo-600 text-white p-4 rounded-full">
              <Database size={36} className="animate-pulse" />
            </div>
          </div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">建立快取中...</h2>
          <p className="text-slate-400 dark:text-slate-500 text-sm text-center">正在下載 FF14 物品資料庫，完成後即可秒搜</p>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
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

  const renderTimedInfo = (node) => {
    if (!node.timeRestriction || !node.spawns || node.spawns.length === 0) return null;
    
    const status = getSpawnStatus(node.spawns, node.duration);
    
    return (
      <div className={`mt-2 p-3 rounded-xl flex items-center justify-between text-xs font-black shadow-sm border transition-all ${
        status.isActive 
          ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 animate-pulse'
          : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50'
      }`}>
        <div className="flex items-center gap-2">
          <Clock size={16} className={status.isActive ? 'animate-spin-slow' : ''} />
          <div className="flex flex-col">
            <span className="uppercase tracking-widest text-[11px] opacity-70">
              {status.isActive ? '正在刷新中' : '等待刷新'}
            </span>
            <span className="text-[13px]">{node.spawns.map(s => `${String(s).padStart(2, '0')}:00`).join(', ')}</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] opacity-70 uppercase tracking-tighter">
            {status.isActive ? '剩餘持續時間' : '距離下次刷新'}
          </span>
          <span className="font-mono text-base">
            {status.isActive ? formatRealTime(status.secondsRemainingReal) : formatRealTime(status.secondsUntilReal)}
          </span>
        </div>
      </div>
    );
  };

  const renderMap = (mapInfo, x, y, title, subtitle) => {
    if (!mapInfo) return null;

    return (
      <div className="mx-2 my-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 shadow-sm animate-in zoom-in-95 duration-200 whitespace-normal">
        <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 mb-1.5 flex items-center justify-between">
          <span className="truncate mr-2">
            {title} {subtitle && <span className="opacity-70 font-bold ml-1 text-[10px]">{subtitle}</span>}
          </span>
          <span className="shrink-0 text-slate-400 dark:text-slate-500">X:{x}, Y:{y}</span>
        </div>
        <div className="relative aspect-video w-full bg-slate-100 dark:bg-slate-900 rounded overflow-hidden border border-slate-200 dark:border-slate-700">
          <img 
            src={`https://xivapi.com/m/${mapInfo.path}.jpg`} 
            alt={title}
            className="w-full h-full object-cover dark:opacity-80"
          />
          
          {/* Aetheryte Markers */}
          {mapInfo.aetherytes?.map(ae => (
            <div 
              key={ae.id}
              className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125 z-10"
              style={{ left: getMarkerPos(ae.x, mapInfo.sizeFactor), top: getMarkerPos(ae.y, mapInfo.sizeFactor) }}
              title={ae.name}
            >
              <div className="absolute inset-0 bg-blue-400/30 rounded-full blur-[2px] animate-pulse" />
              <img src="https://xivapi.com/i/060000/060453.png" alt={ae.name} className="w-full h-full relative z-10 drop-shadow-md" />
            </div>
          ))}

          {/* Marker */}
          <div 
            className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 z-20"
            style={{ left: getMarkerPos(x, mapInfo.sizeFactor), top: getMarkerPos(y, mapInfo.sizeFactor) }}
          >
            <div className="absolute inset-0 bg-red-500/40 rounded-full blur-[3px] animate-ping duration-1000" />
            <img src="https://xivapi.com/i/060000/060432.png" alt="Marker" className="w-full h-full relative z-10 drop-shadow-lg" />
          </div>
        </div>
      </div>
    );
  };

  const renderMiniMap = (itemId, nodes) => {
    if (!nodes || nodes.length === 0) return null;
    const firstNode = nodes[0];
    const mapInfo = mapData.byId?.[firstNode.mapId];
    if (!mapInfo) return null;

    return renderMap(
      mapInfo,
      firstNode.x,
      firstNode.y,
      `${mapInfo.zoneName ? `${mapInfo.zoneName} - ` : ''}${firstNode.placeName}`,
      `(Lv.${firstNode.level})`
    );
  };

  const renderNode = (node) => {
    const nodeKey = `${node.id}-${node.depth}`;
    const isExpanded = expandedIngredients.has(nodeKey);
    const ingredientNodes = gatheringData[node.id] || [];
    const hasGathering = ingredientNodes.length > 0;
    const isTimed = ingredientNodes.some(n => n.timeRestriction);

    return (
      <div key={nodeKey} className="flex flex-col gap-1">
        <div 
          onClick={() => hasGathering && toggleIngredientMap(nodeKey)}
          className={`flex items-center justify-between px-4 py-2 rounded-lg border-l-4 text-base transition-all ${
            depthColors[node.depth % depthColors.length]
          } ${hasGathering ? 'cursor-pointer hover:brightness-95 dark:hover:brightness-110 active:scale-[0.98]' : 'cursor-default'}`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <span 
              className="font-semibold truncate"
              title={node.name}
            >
              {node.name}
            </span>
            {isTimed && (
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="shrink-0 flex items-center gap-1 bg-amber-500 dark:bg-amber-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter shadow-sm">
                  <Clock size={10} /> 限時
                </span>
                {(() => {
                  const node = ingredientNodes.find(n => n.timeRestriction);
                  const status = getSpawnStatus(node.spawns, node.duration);
                  return (
                    <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {status.isActive ? '剩餘' : '下次'}: {status.isActive ? formatRealTime(status.secondsRemainingReal) : formatRealTime(status.secondsUntilReal)}
                    </span>
                  );
                })()}
              </div>
            )}
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
                  className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-300 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                  title="查看完整物品資訊"
                >
                  <ChevronRight size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToTracker(itemsMap[node.id], node.amount);
                  }}
                  className="p-1 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-slate-300 dark:text-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  title="加入追蹤清單"
                >
                  <ShoppingBag size={12} />
                </button>
              </div>
            )}
          </div>
          <span className="ml-3 font-black opacity-60 dark:opacity-40 shrink-0">×{node.amount}</span>
        </div>

        {/* 迷你地圖顯示 */}
        {isExpanded && hasGathering && renderMiniMap(node.id, ingredientNodes)}

        {node.children.length > 0 && (
          <div className="ml-5 flex flex-col gap-1 border-l-2 border-slate-200 dark:border-slate-800 pl-3 mt-1">
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
        <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-800 gap-4 py-20 transition-colors">
          <Box size={64} strokeWidth={1} />
          <p className="font-medium text-lg text-slate-400 dark:text-slate-600">點擊左側物品查看詳情</p>
        </div>
      );
    }

    const id = String(selectedItem.id);
    const nodes = gatheringData[id] || [];
    const recipes = recipeData[id] || [];
    const sources = sourcesData[id] || [];

    const hasGC = sources.some(s => s.type === 'gcshop' || s.currency === 'gc_seals');
    const hasPoetics = !hasGC && sources.some(s => 
      s.currencyItemId === 28 || 
      (s.typeName && (s.typeName.includes('詩學') || s.typeName.includes('神典石')))
    );

    return (
      <div className="flex flex-col gap-6">
        {history.length > 0 && (
          <button 
            onClick={handleBack}
            className="flex items-center gap-1 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-2 self-start bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1.5 rounded-full shadow-sm border border-slate-200 dark:border-slate-700"
          >
            <ChevronLeft size={16} />
            返回 {history[history.length - 1].name}
          </button>
        )}
        {/* 物品名稱 */}
        <div className="border-b-2 border-slate-100 dark:border-slate-800 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{selectedItem.name}</h2>
              {nodes.length > 0 ? (
                <span className="flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider border border-emerald-200 dark:border-emerald-800 shadow-sm">
                  <Pickaxe size={12} /> 可採集
                </span>
              ) : (
                <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 shadow-sm">
                  非採集物品
                </span>
              )}
              {hasGC && (
                <span className="flex items-center gap-1.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-wider border border-indigo-200 dark:border-indigo-800 shadow-sm">
                  <ShoppingBag size={12} /> 軍票兌換
                </span>
              )}
              {hasPoetics && (
                <span className="flex items-center gap-1.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-wider border border-purple-200 dark:border-purple-800 shadow-sm">
                  <Database size={12} /> 詩學兌換
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">ID: {selectedItem.id}</p>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-slate-200 dark:border-slate-700 shadow-sm">
                <Clock size={12} />
                <span className="font-mono">ET {String(et.hours).padStart(2, '0')}:{String(et.minutes).padStart(2, '0')}</span>
              </div>
            </div>
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
          <h3 className="flex items-center gap-2 text-base font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-4">
            <Pickaxe size={18} /> 採集地點
          </h3>
          {nodes.length > 0 ? (
            <div className="flex flex-col gap-3">
              {nodes.map((node, i) => {
                const mapInfo = mapData.byId?.[node.mapId];
                const isMapVisible = selectedMapNode === `${node.id}-${i}`;
                
                return (
                  <div key={node.id || i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div 
                      onClick={() => setSelectedMapNode(isMapVisible ? null : `${node.id}-${i}`)}
                      className={`p-4 cursor-pointer flex flex-col gap-1 relative ${isMapVisible ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 dark:bg-indigo-600" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 pl-2 text-base">
                          <MapPin size={15} className="text-indigo-500 shrink-0" />
                          {mapInfo?.zoneName ? `${mapInfo.zoneName} - ` : ''}{node.placeName}
                        </div>
                        <div className="text-xs font-black uppercase text-indigo-400 dark:text-indigo-500 tracking-widest">
                          {isMapVisible ? '隱藏地圖' : '顯示地圖'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pl-2 mt-1 flex-wrap">
                        <span className="text-sm bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded font-black border border-indigo-200 dark:border-indigo-800">
                          X:{node.x} , Y:{node.y}
                        </span>
                        <span className="text-sm bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded font-black">
                          Lv.{node.level}{node.stars ? ` ${'★'.repeat(node.stars)}` : ''}
                        </span>
                        <span className="text-sm text-slate-400 dark:text-slate-500 font-bold">{node.gatheringTypeName}</span>
                      </div>
                      {renderTimedInfo(node)}
                    </div>

                    {/* 地圖顯示區 */}
                    {isMapVisible && mapInfo && (
                      <div className="border-t border-indigo-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="relative aspect-square w-full max-w-[400px] mx-auto bg-slate-200 dark:bg-slate-900 rounded-lg shadow-inner overflow-hidden border-2 border-white dark:border-slate-800">
                          <img 
                            src={`https://xivapi.com/m/${mapInfo.path}.jpg`} 
                            alt={node.placeName}
                            className="w-full h-full object-cover dark:opacity-80"
                          />
                          {/* Aetheryte Markers */}
                          {mapInfo.aetherytes?.map(ae => (
                            <div 
                              key={ae.id}
                              className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125 z-10"
                              style={{ left: getMarkerPos(ae.x, mapInfo.sizeFactor), top: getMarkerPos(ae.y, mapInfo.sizeFactor) }}
                              title={ae.name}
                            >
                              <div className="absolute inset-0 bg-blue-400/30 rounded-full blur-[2px] animate-pulse" />
                              <img src="https://xivapi.com/i/060000/060453.png" alt={ae.name} className="w-full h-full relative z-10 drop-shadow-md" />
                            </div>
                          ))}

                          {/* 採集物標記 */}
                          <div 
                            className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 z-20"
                            style={{ 
                              left: getMarkerPos(node.x, mapInfo.sizeFactor), 
                              top: getMarkerPos(node.y, mapInfo.sizeFactor) 
                            }}
                          >
                            <div className="absolute inset-0 bg-red-500/40 rounded-full blur-[4px] animate-ping duration-1000" />
                            <img src="https://xivapi.com/i/060000/060432.png" alt="Node" className="w-full h-full relative z-10 drop-shadow-lg" />
                          </div>
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
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 transition-colors">
              <Database size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-3 opacity-50" />
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">此物品目前無採集資料</p>
              <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">可能是製作、購買、或特殊獲取物。</p>
            </div>
          )}
        </div>

        {/* 製作配方 */}
        {recipes.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-base font-black text-amber-700 dark:text-amber-500 uppercase tracking-wider mb-4">
              <Hammer size={18} /> 製作配方
            </h3>
            <div className="flex flex-col gap-4">
              {recipes.map((recipe, ri) => {
                const tree = resolveTree(recipe.ingredients || []);
                return (
                  <div key={recipe.id || ri} className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-400 dark:bg-amber-600 rounded-l-xl" />
                    <div className="flex items-center gap-3 mb-4 pl-2">
                      <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full font-black text-sm border border-amber-300 dark:border-amber-800">
                        {recipe.craftTypeName}
                      </span>
                      <span className="text-sm text-slate-400 dark:text-slate-500 font-medium">Lv.{recipe.recipeLevel} → ×{recipe.resultAmount}</span>
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

        {/* 獲取來源 */}
        {sourcesData[id] && sourcesData[id].length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-base font-black text-emerald-700 dark:text-emerald-500 uppercase tracking-wider mb-4">
              <ShoppingBag size={18} /> 獲取來源
            </h3>
            <div className="grid grid-cols-1 gap-3">
            {sourcesData[id].map((source, si) => {
                const isGC = source.type === 'gcshop';
                const hasVendors = source.vendors && source.vendors.length > 0;
                
                return (
                  <div key={si} className={`p-4 rounded-xl border flex flex-col gap-2 ${
                    isGC ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30' : 
                    'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                          isGC ? 'bg-indigo-600 text-white border-indigo-500' :
                          'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}>
                          {source.typeName}
                        </span>
                        {isGC && <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">軍票兌換</span>}
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">{source.price?.toLocaleString()}</span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                          {source.currency === 'gc_seals' ? '軍票' : '金幣'}
                        </span>
                      </div>
                    </div>

                    {hasVendors && source.vendors.map((vendor, vi) => {
                      const vendorKey = `${si}-${vi}`;
                      const isMapVisible = selectedVendorMap === vendorKey;
                      const mapInfo = mapData.byName?.[vendor.zoneName];
                      const hasCoords = vendor.x && vendor.y && mapInfo;

                      return (
                        <div key={vi} className="flex flex-col gap-1 mt-1 border-t border-slate-100 dark:border-slate-800 pt-2 first:border-t-0 first:pt-0">
                          <div 
                            onClick={() => hasCoords && setSelectedVendorMap(isMapVisible ? null : vendorKey)}
                            className={`flex items-start justify-between gap-2 p-1.5 rounded-lg transition-all ${
                              hasCoords ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''
                            }`}
                          >
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                                <MapPin size={12} className={hasCoords ? 'text-indigo-500' : 'text-slate-400'} />
                                <span className="truncate">{vendor.npcName}</span>
                              </div>
                              <div className="text-xs text-slate-400 dark:text-slate-500 pl-5">
                                {vendor.zoneName}{vendor.x ? ` (X:${vendor.x}, Y:${vendor.y})` : ''}
                              </div>
                            </div>
                            {hasCoords && (
                              <span className="text-[9px] font-black text-indigo-500/70 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0 mt-1">
                                {isMapVisible ? '隱藏地圖' : '查看地圖'}
                              </span>
                            )}
                          </div>
                          {isMapVisible && hasCoords && renderMap(
                            mapInfo,
                            vendor.x,
                            vendor.y,
                            vendor.zoneName,
                            vendor.npcName
                          )}
                        </div>
                      );
                    })}
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
      <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 w-72 shrink-0 overflow-hidden">
        <header className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">
            <ShoppingBag size={18} className="text-emerald-500" /> 追蹤清單
          </h3>
          {trackedItems.length > 0 && (
            <button 
              onClick={() => setTrackedItems([])}
              className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase"
            >
              全部清除
            </button>
          )}
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {trackedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300 dark:text-slate-800 gap-3">
              <Plus size={32} strokeWidth={1} />
              <p className="text-xs text-center px-4 text-slate-400 dark:text-slate-700">點擊材料旁的 <ShoppingBag size={10} className="inline" /> <br/>即可加入追蹤</p>
            </div>
          ) : (
            trackedItems.map(item => {
              const nodes = gatheringData[String(item.id)] || [];
              const mapInfo = nodes.length > 0 ? mapData.byId?.[nodes[0].mapId] : null;
              const hasMap = nodes.length > 0 && mapInfo;
              const isExpanded = expandedTrackerItems.has(item.id);

              return (
                <div key={item.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm group animate-in fade-in slide-in-from-right-2 duration-300 overflow-hidden">
                  <div 
                    onClick={() => hasMap && toggleTrackerMap(item.id)}
                    className={`p-3 transition-colors ${hasMap ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex items-center gap-2 truncate flex-1">
                        <span 
                          className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (itemsMap[item.id]) setSelectedItem(itemsMap[item.id]);
                          }}
                        >
                          {item.name}
                        </span>
                        {hasMap && (
                          <MapPin size={12} className={`${isExpanded ? 'text-red-500' : 'text-slate-400 dark:text-slate-700'} shrink-0`} />
                        )}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromTracker(item.id);
                        }}
                        className="text-slate-300 dark:text-slate-700 hover:text-red-500 transition-colors ml-2"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 dark:text-slate-600 font-bold tracking-tight">ID: {item.id}</span>
                      <div className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-black px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-800">
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
          <div className="p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">待收集項目</span>
              <span className="text-base font-black text-indigo-600 dark:text-indigo-400">{trackedItems.length}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Main layout ───────────────────────────────────────────────
  return (
    <div className="flex flex-1 overflow-hidden h-full">
        {/* ── Left panel ── */}
        <div className="w-72 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-colors duration-300">
          {/* Search form */}
          <form onSubmit={handleSearch} className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="輸入物品名稱..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex-grow text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-600"
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
              <div className="flex flex-col items-center justify-center py-16 text-slate-300 dark:text-slate-800 gap-3">
                <Box size={40} strokeWidth={1} />
                <p className="text-sm text-slate-400 dark:text-slate-700">搜尋以顯示結果</p>
              </div>
            )}
            {results.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setHistory([]);
                  setSelectedItem(item);
                }}
                className={`w-full text-left px-5 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group ${selectedItem?.id === item.id ? 'bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-semibold truncate ${selectedItem?.id === item.id ? 'text-indigo-700 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                      {item.name}
                    </span>
                    {gatheringData[item.id] && gatheringData[item.id].length > 0 && (
                      <div className="shrink-0 text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 p-0.5 rounded" title="可採集">
                        <Pickaxe size={12} />
                      </div>
                    )}
                    {sourcesData[item.id] && sourcesData[item.id].some(s => s.type === 'gcshop' || s.currency === 'gc_seals') && (
                      <div className="shrink-0 text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 p-0.5 rounded" title="軍票兌換">
                        <ShoppingBag size={12} />
                      </div>
                    )}
                    {sourcesData[item.id] && !sourcesData[item.id].some(s => s.type === 'gcshop' || s.currency === 'gc_seals') && 
                     sourcesData[item.id].some(s => s.currencyItemId === 28 || (s.typeName && (s.typeName.includes('詩學') || s.typeName.includes('神典石')))) && (
                      <div className="shrink-0 text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 p-0.5 rounded" title="詩學兌換">
                        <Database size={12} />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">ID: {item.id}</span>
                </div>
                <ChevronRight size={18} className={`shrink-0 transition-colors ${selectedItem?.id === item.id ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-700 group-hover:text-indigo-400'}`} />
              </button>
            ))}
          </div>
        </div>

        {/* ── Middle panel ── */}
        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900 transition-colors duration-300">
          <div className="max-w-2xl mx-auto">
            {renderDetail()}
          </div>
        </div>

        {/* ── Right panel (Tracker) ── */}
        {renderTracker()}
    </div>
  );
};

export default SearchItem;
