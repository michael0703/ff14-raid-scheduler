/**
 * Recursively decomposes a list of materials into their base ingredients.
 * 
 * @param {Array} requiredMaterials - Array of { name, amount } objects.
 * @param {Object} recipes - The recipe data (recipes.json).
 * @param {Object} items - The item data (items.json).
 * @returns {Array} - Array of decomposed { name, required, gathered } objects.
 */
export const decomposeMaterials = (requiredMaterials, recipes, items) => {
  const result = {};
  
  // Helper to resolve name from ID
  const getItemName = (id) => items[id]?.name || `#${id}`;
  
  // Create a name-to-ID map for fast lookups if needed (items is already ID-keyed)
  // But we start with names from submarineData
  const itemNamesMap = {};
  Object.entries(items).forEach(([id, item]) => {
    itemNamesMap[item.name] = id;
  });

  const decompose = (itemId, amount) => {
    const itemRecipes = recipes[itemId];
    
    // If no recipe, it's a base material
    if (!itemRecipes || itemRecipes.length === 0) {
      const name = getItemName(itemId);
      result[name] = (result[name] || 0) + amount;
      return;
    }

    // Use the first recipe (usually there's only one for crafted items)
    const recipe = itemRecipes[0];
    const yieldAmount = recipe.resultAmount || 1;
    const craftCount = Math.ceil(amount / yieldAmount);

    recipe.ingredients.forEach(ing => {
      decompose(ing.itemId, ing.amount * craftCount);
    });
  };

  requiredMaterials.forEach(m => {
    const id = itemNamesMap[m.name];
    if (id) {
      decompose(id, m.amount);
    } else {
      // If item not found in database, treat as base
      result[m.name] = (result[m.name] || 0) + m.amount;
    }
  });

  // Convert back to the list format
  return Object.entries(result).map(([name, required]) => ({
    name,
    required,
    gathered: 0 // Will be populated by the caller from Supabase data
  })).sort((a, b) => b.required - a.required);
};
