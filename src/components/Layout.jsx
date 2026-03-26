import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Ship, Swords, Sun, Moon, Clock, Database } from 'lucide-react';
import { getEorzeaTime } from '../utils/eorzeaTime';

const Layout = ({ children }) => {
  const [et, setEt] = useState(getEorzeaTime());
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('ff14-dark-mode');
    return saved === 'true';
  });
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => {
      setEt(getEorzeaTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('ff14-dark-mode', isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const navItems = [
    { path: '/', label: '首頁', icon: <Database size={18} /> },
    { path: '/search-item', label: '物品搜尋', icon: <Search size={18} /> },
    { path: '/submarine', label: '潛水艇採集', icon: <Ship size={18} /> },
    { path: '/ifrit-sim', label: '伊弗利特模擬', icon: <Swords size={18} /> },
  ];

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-indigo-200 dark:shadow-none">
              <Database size={20} />
            </div>
            <span className="font-black text-lg tracking-tight hidden sm:block">FF14 Raid Tools</span>
          </Link>
          
          <nav className="flex items-center gap-1">
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                    isActive 
                      ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' 
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.icon}
                  <span className="hidden md:block">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Eorzea Time Clock */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black border bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-slate-200 dark:border-slate-700 shadow-sm">
            <Clock size={14} className="animate-pulse" />
            <span className="font-mono">ET {String(et.hours).padStart(2, '0')}:{String(et.minutes).padStart(2, '0')}</span>
          </div>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
};

export default Layout;
