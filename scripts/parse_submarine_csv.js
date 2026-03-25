import fs from 'fs';
import path from 'path';

const csvPath = 'c:/Users/FenWei/Desktop/Cases/ff14-raid-scheduler/public/data/submarine_material.csv';
const outputPath = 'c:/Users/FenWei/Desktop/Cases/ff14-raid-scheduler/src/data/submarine_materials.json';

const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split('\n');

const recipes = {};
// Structure: { "Shark": { "船體": { "Material": quantity, ... }, ... }, ... }

lines.slice(1).forEach(line => {
    if (!line.trim()) return;
    const parts = line.split(',');
    
    // Left side: Submarine Parts
    const partName = parts[0]?.trim(); // e.g., 鯊魚級船體
    const materialName = parts[1]?.trim();
    const quantity = parseInt(parts[2]?.trim());

    if (partName && materialName && !isNaN(quantity)) {
        // Extract class and type
        // This is tricky as names vary: 鯊魚級船體, 鯊魚改級船體, 希爾德拉級船體
        let className, partType;
        if (partName.includes('船體')) { className = partName.replace('船體', ''); partType = '船體'; }
        else if (partName.includes('船尾')) { className = partName.replace('船尾', ''); partType = '船尾'; }
        else if (partName.includes('船首')) { className = partName.replace('船首', ''); partType = '船首'; }
        else if (partName.includes('艦橋')) { className = partName.replace('艦橋', ''); partType = '艦橋'; }

        if (className && partType) {
            if (!recipes[className]) recipes[className] = {};
            if (!recipes[className][partType]) recipes[className][partType] = {};
            recipes[className][partType][materialName] = quantity;
        }
    }
});

fs.writeFileSync(outputPath, JSON.stringify(recipes, null, 2));
console.log('Conversion complete! Saved to:', outputPath);
