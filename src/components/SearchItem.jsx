import { useState, useEffect } from 'react';
import { Search, Database, Box, MapPin, Pickaxe, Hammer, ChevronRight } from 'lucide-react';

const SearchItem = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cachedItems, setCachedItems] = useState([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [gatheringData, setGatheringData] = useState({});
  const [recipeData, setRecipeData] = useState({});
  const [itemsMap, setItemsMap] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const [itemsRes, gatheringRes, recipesRes] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}data/items.json`),
          fetch(`${import.meta.env.BASE_URL}data/gathering.json`),
          fetch(`${import.meta.env.BASE_URL}data/recipes.json`),
        ]);
        if (!itemsRes.ok || !gatheringRes.ok || !recipesRes.ok)
          throw new Error('無法取得資料');
        const data = await itemsRes.json();
        const gathering = await gatheringRes.json();
        const recipes = await recipesRes.json();
        const allItems = Object.values(data.items || data);
        if (mounted) {
          setCachedItems(allItems);
          setItemsMap(data.items || {});
          setGatheringData(gathering.points || {});
          setRecipeData(recipes.recipes || {});
          setIsInitializing(false);
        }
      } catch (err) {
        if (mounted) { setError(err.message); setIsInitializing(false); }
      }
    };
    init();
    return () => { mounted = false; };
  }, []);

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

  const renderNode = (node) => (
    <div key={`${node.id}-${node.depth}`} className="flex flex-col gap-0.5">
      <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg border-l-4 text-sm ${depthColors[node.depth % depthColors.length]}`}>
        <span className="font-semibold">{node.name}</span>
        <span className="ml-3 font-black opacity-60 shrink-0">×{node.amount}</span>
      </div>
      {node.children.length > 0 && (
        <div className="ml-5 flex flex-col gap-0.5 border-l-2 border-slate-200 pl-3 mt-0.5">
          {node.children.map(renderNode)}
        </div>
      )}
    </div>
  );

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
        {/* 物品名稱 */}
        <div className="border-b border-slate-200 pb-4">
          <h2 className="text-2xl font-black text-slate-800">{selectedItem.name}</h2>
          <p className="text-xs text-slate-400 mt-1">ID: {selectedItem.id}</p>
        </div>

        {/* 採集地點 */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black text-indigo-700 uppercase tracking-wide mb-3">
            <Pickaxe size={15} /> 採集地點
          </h3>
          {nodes.length > 0 ? (
            <div className="flex flex-col gap-2">
              {nodes.map((node, i) => (
                <div key={node.id || i} className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex flex-col gap-1 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 rounded-l-xl" />
                  <div className="flex items-center gap-2 font-bold text-slate-800 pl-2 text-sm">
                    <MapPin size={13} className="text-indigo-500 shrink-0" />
                    {node.placeName}
                  </div>
                  <div className="flex items-center gap-2 pl-2 flex-wrap">
                    <span className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-medium">
                      X:{node.x} , Y:{node.y}
                    </span>
                    <span className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded font-black">
                      Lv.{node.level}{node.stars ? ` ${'★'.repeat(node.stars)}` : ''}
                    </span>
                    <span className="text-xs text-slate-400">{node.gatheringTypeName}</span>
                  </div>
                </div>
              ))}
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
        <div className="w-80 shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
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
                onClick={() => setSelectedItem(item)}
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

        {/* ── Right panel ── */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            {renderDetail()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchItem;
