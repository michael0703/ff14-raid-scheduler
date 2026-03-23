import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Settings as SettingsIcon, Database, Users, Shield, Bell, Palette, Globe } from 'lucide-react';

const SettingsPage = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-slate-600 hover:text-slate-900 transition-colors">
                <ArrowLeft size={20} />
              </Link>
              <h1 className="text-xl font-black text-slate-800">系統設定</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Settings Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <nav className="space-y-1">
                <button className="w-full text-left px-4 py-2 rounded-lg bg-blue-50 text-blue-600 font-medium">
                  <div className="flex items-center gap-3">
                    <Database size={18} />
                    <span>資料庫管理</span>
                  </div>
                </button>
                <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <Users size={18} />
                    <span>用戶設定</span>
                  </div>
                </button>
                <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <SettingsIcon size={18} />
                    <span>安全設定</span>
                  </div>
                </button>
                <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <Bell size={18} />
                    <span>通知設定</span>
                  </div>
                </button>
                <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <Palette size={18} />
                    <span>外觀設定</span>
                  </div>
                </button>
                <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <Globe size={18} />
                    <span>語言設定</span>
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-2xl font-black text-slate-800 mb-6">資料庫管理</h2>

              {/* Database Actions */}
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-6">
                  <h3 className="text-lg font-medium text-slate-800 mb-4">資料庫操作</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-slate-200 rounded-lg">
                      <h4 className="font-medium text-slate-800 mb-2">備份資料庫</h4>
                      <p className="text-sm text-slate-600 mb-3">建立當前資料庫的完整備份</p>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        立即備份
                      </button>
                    </div>
                    <div className="p-4 border border-slate-200 rounded-lg">
                      <h4 className="font-medium text-slate-800 mb-2">恢復資料庫</h4>
                      <p className="text-sm text-slate-600 mb-3">從備份檔案恢復資料庫</p>
                      <button className="px-4 py-2 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors">
                        選擇備份檔案
                      </button>
                    </div>
                    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <h4 className="font-medium text-red-800 mb-2">清空資料庫</h4>
                      <p className="text-sm text-red-600 mb-3">刪除所有資料（此操作無法撤銷）</p>
                      <button className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">
                        清空資料庫
                      </button>
                    </div>
                    <div className="p-4 border border-slate-200 rounded-lg">
                      <h4 className="font-medium text-slate-800 mb-2">匯出資料</h4>
                      <p className="text-sm text-slate-600 mb-3">匯出資料為 CSV 格式</p>
                      <button className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
                        匯出資料
                      </button>
                    </div>
                  </div>
                </div>

                {/* Database Statistics */}
                <div className="border-b border-slate-200 pb-6">
                  <h3 className="text-lg font-medium text-slate-800 mb-4">資料庫統計</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-sm text-slate-600 mb-1">用戶數量</p>
                      <p className="text-2xl font-black text-slate-800">156</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-sm text-slate-600 mb-1">副本活動</p>
                      <p className="text-2xl font-black text-slate-800">89</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-sm text-slate-600 mb-1">資料庫大小</p>
                      <p className="text-2xl font-black text-slate-800">2.4 MB</p>
                    </div>
                  </div>
                </div>

                {/* System Configuration */}
                <div>
                  <h3 className="text-lg font-medium text-slate-800 mb-4">系統配置</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div>
                        <h4 className="font-medium text-slate-800">自動備份</h4>
                        <p className="text-sm text-slate-600">每日自動建立資料庫備份</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div>
                        <h4 className="font-medium text-slate-800">資料清理</h4>
                        <p className="text-sm text-slate-600">自動清理超過 30 天的舊資料</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div>
                        <h4 className="font-medium text-slate-800">維護模式</h4>
                        <p className="text-sm text-slate-600">啟用後用戶將無法訪問系統</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
