---
description: 專案開發規範與流程 (App Router 穩定性、驗證流程、Chrome 使用時機)
---

# 專案開發規範

為了確保專案穩定性並符合使用者的開發習慣，請遵循以下規範：

## 1. App.jsx 路由穩定性
每次修改 `src/App.jsx` 時，必須確保以下內容正確無誤：
- **必備引用**：必須包含 `import React from 'react';` 以及 `import { HashRouter as Router, Routes, Route } from 'react-router-dom';`。
- **路徑配置**：所有已註冊的 Component 必須有對應的 import 語句，且路徑正確。
- **防止遺漏**：嚴禁在執行多段編輯（multi-replace）時意外刪除文件頭部的 import 區塊。

## 2. 功能驗證流程
- **手動優先**：完成程式碼撰寫與編譯（npm run build/dev）後，**不需要**開啟 `browser_subagent` 進行自動化檢查。
- **使用者驗證**：功能完成後直接通知使用者，由使用者在本地環境手動檢查。這樣可以節省開發時間並提高效率。

## 3. Chrome Browser 使用時機
- **僅限參考**：只有在使用者提供特定「外部網站功能」作為參考，且需要深入了解其 UI/UX 或運作邏輯時，才開啟 `browser_subagent` 或 `read_browser_page` 進行研究。
- **開發期間**：平時撰寫邏輯與修復 Bug 時，應保持 Chrome 關閉以節省資源。

## 4. 潛水艇資料處理
- **資料來源**：優先參考 `public/data/submarine_material.csv`，並使用 `scripts/parse_submarine_csv.js` 轉換為 `src/data/submarine_materials.json` 後供前端使用。
- **組件邏輯**：`SubmarineGathering.jsx` 應確保能處理「改」系列船隻的特殊加總邏輯（例如骨架兌換）。
