import React, { useState, useEffect } from 'react';
import { 
  Box, MapPin, Pickaxe, Hammer, ChevronLeft, ShoppingBag, Database 
} from 'lucide-react';

const ItemDetailView = ({ item, itemName, onBack }) => {
  const [gatheringData, setGatheringData] = useState({});
  const [recipeData, setRecipeData] = useState({});
  const [sourcesData, setSourcesData] = useState({});
  const [mapData, setMapData] = useState({});
  const [itemsMap, setItemsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedMapNode, setSelectedMapNode] = useState(null);
  const [resolvedItem, setResolvedItem] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, gatheringRes, recipesRes, mapsRes, sourcesRes] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}data/items.json`),
          fetch(`${import.meta.env.BASE_URL}data/gathering.json`),
          fetch(`${import.meta.env.BASE_URL}data/recipes.json`),
          fetch(`${import.meta.env.BASE_URL}data/zone-maps.json`),
          fetch(`${import.meta.env.BASE_URL}data/sources.json`),
        ]);

        const items = await itemsRes.json();
        const gathering = await gatheringRes.json();
        const recipes = await recipesRes.json();
        const maps = await mapsRes.json();
        const sources = await sourcesRes.json();

        const actualItemsMap = items.items || items;
        setItemsMap(actualItemsMap);
        setGatheringData(gathering.points || {});
        setRecipeData(recipes.recipes || {});
        setSourcesData(sources.sources || {});

        const mapsById = {};
        if (maps.maps) {
          Object.entries(maps.maps).forEach(([name, m]) => {
            if (m.id) mapsById[m.id] = { ...m, zoneName: name };
          });
        }
        setMapData(mapsById);

        // Resolve item from either prop or itemName
        let foundItem = item;
        if (!foundItem && itemName) {
          foundItem = Object.values(actualItemsMap).find(i => i.name === itemName);
        }
        setResolvedItem(foundItem);
        setLoading(false);
      } catch (err) {
        console.error('Error loading item detail data:', err);
        setLoading(false);
      }
    };

    fetchData();
  }, [item, itemName]);

  const getMarkerPos = (coord, sizeFactor) => {
    const pos = (coord - 1) * (sizeFactor / 41);
    return `${pos}%`;
  };

  const renderMiniMap = (nodes) => {
    if (!nodes || nodes.length === 0) return null;
    const firstNode = nodes[0];
    const miniMapInfo = mapData[firstNode.mapId];
    if (!miniMapInfo) return null;

    return (
      <div className="mt-4 bg-slate-800/50 border border-slate-700 rounded-xl p-3 shadow-inner">
        <div className="text-xs font-black text-blue-400 mb-2 flex items-center justify-between">
          <span className="truncate mr-2">
            {miniMapInfo.zoneName ? `${miniMapInfo.zoneName} - ` : ''}{firstNode.placeName} (Lv.{firstNode.level})
          </span>
          <span className="shrink-0 text-slate-500">X:{firstNode.x}, Y:{firstNode.y}</span>
        </div>
        <div className="relative aspect-video w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
          <img 
            src={`https://xivapi.com/m/${miniMapInfo.path}.jpg`} 
            alt={firstNode.placeName}
            className="w-full h-full object-cover opacity-80"
          />
          {miniMapInfo.aetherytes?.map(ae => (
            <div 
              key={ae.id}
              className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2"
              style={{ left: getMarkerPos(ae.x, miniMapInfo.sizeFactor), top: getMarkerPos(ae.y, miniMapInfo.sizeFactor) }}
            >
              <img src="https://xivapi.com/i/060000/060453.png" alt={ae.name} className="w-full h-full relative z-10" />
            </div>
          ))}
          <div 
            className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 z-20"
            style={{ left: getMarkerPos(firstNode.x, miniMapInfo.sizeFactor), top: getMarkerPos(firstNode.y, miniMapInfo.sizeFactor) }}
          >
            <div className="absolute inset-0 bg-red-500/40 rounded-full blur-[3px] animate-ping duration-1000" />
            <img src="https://xivapi.com/i/060000/060432.png" alt="Node" className="w-full h-full relative z-10" />
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 animate-pulse">
        <Database size={32} className="mb-4 text-blue-500" />
        <p className="text-sm font-bold">載入物品資料中...</p>
      </div>
    );
  }

  if (!resolvedItem) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 italic">
        <Box size={32} className="mb-4 opacity-20" />
        <p className="text-sm">找不到該物品的詳細資料</p>
      </div>
    );
  }

  const id = String(resolvedItem.id);
  const nodes = gatheringData[id] || [];
  const recipes = recipeData[id] || [];

  return (
    <div className="flex flex-col gap-6 animate-in slide-in-from-right duration-500">
      {onBack && (
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors self-start"
        >
          <ChevronLeft size={16} /> 返回列表
        </button>
      )}

      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-3xl font-black text-white tracking-tight">{resolvedItem.name}</h2>
          {nodes.length > 0 && (
            <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-[10px] font-black border border-emerald-500/20">
              可採集
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 font-mono">ID: {resolvedItem.id}</p>
      </div>

      {nodes.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black text-blue-400 uppercase tracking-widest mb-4">
            <Pickaxe size={16} /> 採集地點
          </h3>
          <div className="space-y-3">
            {nodes.map((node, i) => (
              <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-blue-500/30 transition-all">
                <div 
                  onClick={() => setSelectedMapNode(selectedMapNode === i ? null : i)}
                  className="p-4 cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-200 flex items-center gap-2">
                      <MapPin size={14} className="text-blue-500" />
                      {mapData[node.mapId]?.zoneName || node.placeName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">
                      {selectedMapNode === i ? '隱藏地圖' : '顯示地圖'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">X:{node.x}, Y:{node.y}</span>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">Lv.{node.level}</span>
                  </div>
                </div>
                {selectedMapNode === i && renderMiniMap([node])}
              </div>
            ))}
          </div>
        </div>
      )}

      {recipes.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black text-amber-500 uppercase tracking-widest mb-4">
            <Hammer size={16} /> 製作配方
          </h3>
          <div className="space-y-3">
            {recipes.map((recipe, ri) => (
              <div key={ri} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-xs font-black border border-amber-500/20">
                    {recipe.craftTypeName}
                  </span>
                  <span className="text-xs text-slate-500">Lv.{recipe.recipeLevel} → ×{recipe.resultAmount}</span>
                </div>
                <div className="space-y-1">
                  {(recipe.ingredients || []).map((ing, ii) => (
                    <div key={ii} className="flex justify-between items-center text-sm p-2 rounded hover:bg-white/5 transition-colors">
                      <span className="text-slate-300">{itemsMap[ing.itemId]?.name || `#${ing.itemId}`}</span>
                      <span className="font-black text-slate-500">×{ing.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sourcesData[id] && sourcesData[id].length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black text-emerald-500 uppercase tracking-widest mb-4">
            <ShoppingBag size={16} /> 獲取來源
          </h3>
          <div className="space-y-2">
            {sourcesData[id].map((source, si) => (
              <div key={si} className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-300">{source.typeName}</span>
                <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-full">
                  <span className="text-xs font-black text-slate-200">{source.price?.toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-slate-500">{source.currency === 'gc_seals' ? '軍票' : '金幣'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemDetailView;
