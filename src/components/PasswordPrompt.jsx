import React, { useState } from 'react';
import { Lock, Unlock, AlertCircle } from 'lucide-react';

const PasswordPrompt = ({ onAuthenticated }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD?.replace(/[';]/g, '');
    const secondaryPassword = import.meta.env.VITE_SECONDARY_PASSWORD?.replace(/[';]/g, '');

    if (password === adminPassword || (secondaryPassword && password === secondaryPassword)) {
      sessionStorage.setItem('isAuthorized', 'true');
      onAuthenticated();
    } else {
      setError(true);
      setPassword('');
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 border border-slate-700">
            <Lock className="text-orange-500" size={32} />
          </div>
          <h2 className="text-2xl font-black text-white italic tracking-tighter">RESTRICTED AREA</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">請輸入管理密碼以訪問此頁面</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin Password"
              className={`w-full bg-slate-950 border ${error ? 'border-red-500' : 'border-slate-800'} focus:border-orange-500 rounded-xl px-4 py-3 text-white outline-none transition-all font-mono`}
              autoFocus
            />
            {error && (
              <div className="absolute -bottom-6 left-0 flex items-center gap-1 text-[10px] text-red-500 font-bold animate-shake">
                <AlertCircle size={10} />
                <span>密碼錯誤，請重試</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-slate-100 hover:bg-white text-slate-950 font-black py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Unlock size={18} />
            驗證並進入
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/50 text-center">
          <p className="text-[10px] text-slate-600 font-bold italic">
            💡 本頁面涉及資料庫修改權限，僅開放給專案管理員使用。
          </p>
        </div>
      </div>
    </div>
  );
};

export default PasswordPrompt;
