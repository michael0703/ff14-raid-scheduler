import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Search, Ship, Flame } from 'lucide-react';

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200 text-white">
                <Shield size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight">FF14 工具箱</h1>
                <p className="text-xs text-slate-500 font-medium">個人常用工具集</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-blue-600 font-black text-sm">首頁</Link>
              <Link to="/search-item" className="text-slate-600 hover:text-blue-600 font-medium text-sm transition-colors">查找物品</Link>
              <Link to="/submarine" className="text-slate-600 hover:text-blue-600 font-medium text-sm transition-colors">潛水艇採集</Link>
              <Link to="/ifrit-sim" className="text-slate-600 hover:text-blue-600 font-medium text-sm transition-colors">火神衝練習</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative flex-grow flex items-center justify-center overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white min-h-[60vh]">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
          <div className="text-center">
            <h1 className="text-5xl font-black mb-6 tracking-tight">
              FF14 工具箱
            </h1>
            <p className="text-xl mb-12 text-blue-100 max-w-2xl mx-auto">
              個人常用的 FF14 輔助工具，包含物品查詢、採集地點等實用功能。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/submarine"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-10 py-5 rounded-xl font-black shadow-lg hover:bg-blue-700 transition-all active:scale-95 text-lg"
              >
                <Ship size={24} />
                潛水艇採集
              </Link>
              <Link
                to="/ifrit-sim"
                className="inline-flex items-center gap-2 bg-orange-600 text-white px-10 py-5 rounded-xl font-black shadow-lg hover:bg-orange-700 transition-all active:scale-95 text-lg"
              >
                <Flame size={24} />
                火神衝練習
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-50 to-transparent" />
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-600 p-2 rounded-xl text-white">
                  <Shield size={20} />
                </div>
                <h3 className="font-black text-lg">FF14 工具箱</h3>
              </div>
              <p className="text-slate-400 text-sm">
                個人常用工具集，讓遊戲體驗更順暢。
              </p>
            </div>

            <div>
              <h4 className="font-black mb-4">工具</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link to="/search-item" className="hover:text-white transition-colors">查找物品</Link></li>
                <li><Link to="/submarine" className="hover:text-white transition-colors">潛水艇採集</Link></li>
                <li><Link to="/ifrit-sim" className="hover:text-white transition-colors">火神衝練習</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-black mb-4">關於</h4>
              <p className="text-slate-400 text-sm">
                專為 FF14 玩家設計的靜態工具網站。
              </p>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-400">
            <p>&copy; 2024 FF14 工具箱. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
