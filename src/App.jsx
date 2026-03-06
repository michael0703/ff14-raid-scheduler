import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Send, Users, Plus, Calendar, AlertCircle, Clock, CheckCircle2, RefreshCw, Trash2, ShieldAlert } from 'lucide-react';
import { supabase } from './supabaseClient';

// --- 基礎配置 ---
const TIMES = Array.from({ length: 16 }, (_, i) => `${i + 9}:00`);
const getNextSevenDays = () => {
  const days = [];
  const weekNames = ['日', '一', '二', '三', '四', '五', '六'];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const fullDate = `${date.getFullYear()}-${month}-${day}`;
    days.push({
      fullDate,
      displayDate: `${month}/${day}`,
      weekDay: weekNames[date.getDay()]
    });
  }
  return days;
};
const DATES = getNextSevenDays();

const getUserColor = (name) => {
  if (!name) return '#64748b';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash % 360)}, 65%, 40%)`;
};

function App() {
  const [events, setEvents] = useState([]);
  const [currentEventId, setCurrentEventId] = useState(null);
  const [userName, setUserName] = useState(localStorage.getItem('ff14_user_name') || '');
  const [myAvailability, setMyAvailability] = useState(new Set());
  const [groupData, setGroupData] = useState({});
  const [allTeamMembers, setAllTeamMembers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [loading, setLoading] = useState(true);

  // 拖曳相關狀態
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(null); // 'select' 或 'deselect'

  // 1. 抓取資料
  const fetchTeamData = useCallback(async (targetId) => {
    const id = targetId || currentEventId;
    if (!id) return;
    setIsFetching(true);
    try {
      const { data } = await supabase.from('availability').select('user_name, slot_key').eq('event_id', id);
      if (data) {
        const formatted = {};
        const members = new Set();
        data.forEach(row => {
          members.add(row.user_name);
          if (!formatted[row.slot_key]) formatted[row.slot_key] = [];
          formatted[row.slot_key].push(row.user_name);
        });
        setAllTeamMembers(Array.from(members));
        setGroupData(formatted);
      }
    } catch (e) { console.error(e); }
    setIsFetching(false);
  }, [currentEventId]);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.from('events').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) {
        setEvents(data);
        setCurrentEventId(data[0].id);
        fetchTeamData(data[0].id);
      }
      setLoading(false);
    };
    init();
  }, [fetchTeamData]);

  useEffect(() => {
    if (currentEventId && userName.trim()) {
      const fetchUser = async () => {
        const { data } = await supabase.from('availability').select('slot_key').eq('user_name', userName).eq('event_id', currentEventId);
        setMyAvailability(new Set(data?.map(item => item.slot_key) || []));
      };
      fetchUser();
      fetchTeamData();
    }
  }, [currentEventId, userName, fetchTeamData]);

  // --- 拖曳邏輯 ---
  const toggleSlot = (slot, shouldAdd) => {
    setMyAvailability(prev => {
      const next = new Set(prev);
      shouldAdd ? next.add(slot) : next.delete(slot);
      return next;
    });
  };

  const handleMouseDown = (slot) => {
    if (!userName.trim()) return;
    setIsDragging(true);
    const willSelect = !myAvailability.has(slot);
    setDragMode(willSelect ? 'select' : 'deselect');
    toggleSlot(slot, willSelect);
  };

  const handleMouseEnter = (slot) => {
    if (isDragging) {
      toggleSlot(slot, dragMode === 'select');
    }
  };

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
      setDragMode(null);
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // 2. 計算下次開團
  const nextSession = useMemo(() => {
    if (allTeamMembers.length < 8) return { status: 'waiting', msg: `成員不足 (${allTeamMembers.length}/8)` };
    for (const day of DATES) {
      for (const time of TIMES) {
        const key = `${day.fullDate}-${time}`;
        const users = groupData[key] || [];
        if (users.length >= 8) return { status: 'success', date: `${day.displayDate} (${day.weekDay})`, time: time };
      }
    }
    return { status: 'none', msg: '暫無 8 人重疊時段' };
  }, [groupData, allTeamMembers]);

  // --- 管理與送出功能 ---
  const adminClearDatabase = async () => {
    if (!currentEventId) return;
    if (window.confirm(`確定要刪除該事件中所有人的時間資料嗎？`)) {
      setIsSubmitting(true);
      await supabase.from('availability').delete().eq('event_id', currentEventId);
      setMyAvailability(new Set());
      fetchTeamData();
      setIsSubmitting(false);
    }
  };

  const submitAvailability = async () => {
    if (!userName.trim() || !currentEventId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await supabase.from('profiles').upsert({ user_name: userName }, { onConflict: 'user_name' });
      await supabase.from('availability').delete().eq('user_name', userName).eq('event_id', currentEventId);
      const insertData = Array.from(myAvailability).map(slot => ({
        user_name: userName, slot_key: slot, event_id: currentEventId
      }));
      if (insertData.length > 0) await supabase.from('availability').insert(insertData);
      await fetchTeamData();
      alert("更新成功！");
    } catch (err) { alert("更新失敗"); }
    setIsSubmitting(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600">載入副本中...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 select-none pb-20 p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">

        {/* Header */}
        <header className="mb-8 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm items-center relative">
          {isFetching && <RefreshCw size={14} className="absolute top-4 right-6 text-blue-300 animate-spin" />}

          <div className="lg:col-span-3">
            <h1 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-3">
              <div className="w-1.5 h-6 bg-blue-600 rounded-full" /> FF14 約戰助手
            </h1>
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
              <select value={currentEventId || ''} onChange={(e) => setCurrentEventId(e.target.value)}
                className="bg-transparent py-1.5 pl-3 pr-8 font-bold outline-none text-blue-600 text-sm appearance-none cursor-pointer">
                {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <button onClick={() => {
                const n = window.prompt("新事件名稱：");
                if (n) supabase.from('events').insert([{ name: n }]).select().then(({ data }) => {
                  if (data) { setEvents([data[0], ...events]); setCurrentEventId(data[0].id); }
                });
              }} className="bg-white text-blue-600 p-1.5 rounded-lg border border-slate-200"><Plus size={14} /></button>
            </div>
            <button onClick={adminClearDatabase} className="mt-3 flex items-center gap-1 text-[9px] font-black text-red-400 hover:text-red-600 transition-colors uppercase tracking-tighter">
              <ShieldAlert size={12} /> 清空全團資料 (測試用)
            </button>
          </div>

          <div className="lg:col-span-3">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 mb-1 block">你的暱稱</label>
            <input type="text" placeholder="暱稱..." value={userName}
              onChange={(e) => { setUserName(e.target.value); localStorage.setItem('ff14_user_name', e.target.value); }}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl font-bold outline-none focus:border-blue-400" />
          </div>

          <div className="lg:col-span-3">
            <button onClick={submitAvailability} disabled={!userName.trim() || isSubmitting}
              className="w-full bg-blue-600 text-white py-3 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
              <Send size={16} /> {isSubmitting ? '同步中...' : '送出你可以的時間'}
            </button>
          </div>

          <div className="lg:col-span-3 bg-blue-50 border border-blue-100 p-4 rounded-2xl text-center">
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><Clock size={12} /> 下一次開團建議</span>
            {nextSession.status === 'success' ? (
              <div>
                <div className="text-blue-700 font-black text-lg leading-tight">{nextSession.date}</div>
                <div className="text-blue-500 font-bold text-xs">{nextSession.time} 準時開打</div>
              </div>
            ) : <div className="text-slate-400 font-bold text-xs mt-1">{nextSession.msg}</div>}
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">

          {/* 左側：個人編輯 */}
          <div className={`xl:col-span-2 ${!userName.trim() ? 'opacity-20 pointer-events-none' : ''}`}>
            <div className="flex justify-between items-center mb-4 px-2">
              <h2 className="text-[11px] font-black uppercase text-blue-600">1. 填寫你的有空時段 (可滑動選取)</h2>
              <button onClick={() => setMyAvailability(new Set())} className="flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-red-400 transition-colors uppercase"><Trash2 size={12} /> 重置</button>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] text-slate-400 font-black">
                    <th className="py-4 border-r border-b w-16">時段</th>
                    {DATES.map(d => <th key={d.fullDate} className="border-r border-b">{d.displayDate}<br />{d.weekDay}</th>)}
                  </tr>
                </thead>
                <tbody>{TIMES.map(t => (
                  <tr key={t}>
                    <td className="text-[9px] py-3 font-mono border-r border-b text-slate-300">{t}</td>
                    {DATES.map(d => {
                      const s = `${d.fullDate}-${t}`;
                      return (
                        <td
                          key={s}
                          onMouseDown={() => handleMouseDown(s)}
                          onMouseEnter={() => handleMouseEnter(s)}
                          className={`border-r border-b h-12 cursor-pointer transition-colors ${myAvailability.has(s) ? 'bg-blue-500/20 shadow-inner' : 'hover:bg-slate-50'}`}
                        />
                      );
                    })}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>

          {/* 右側：團隊成員分布 */}
          <div className="xl:col-span-3">
            <h2 className="mb-4 text-[11px] font-black uppercase text-slate-500 ml-2">2. 團隊成員分布 ({allTeamMembers.length}/8)</h2>
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full text-center border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 text-[10px] text-slate-400 font-black">
                    <th className="py-4 border-r border-b w-16">時段</th>
                    {DATES.map(d => <th key={`g-${d.fullDate}`} className="border-r border-b">{d.displayDate}</th>)}
                  </tr>
                </thead>
                <tbody>{TIMES.map(t => (
                  <tr key={t}>
                    <td className="text-[9px] py-3 font-mono border-r border-b text-slate-300">{t}</td>
                    {DATES.map(d => {
                      const users = groupData[`${d.fullDate}-${t}`] || [];
                      const isFull = users.length >= 8;
                      return (
                        <td key={`g-${d.fullDate}-${t}`} className={`border-r border-b p-1.5 align-top min-h-[60px] ${isFull ? 'bg-green-50/50' : ''}`}>
                          <div className="flex flex-col gap-1">
                            {allTeamMembers.map(m => users.includes(m) && (
                              <div key={m} style={{ backgroundColor: getUserColor(m) }} className="px-2 py-0.5 rounded text-[9px] text-white font-bold truncate text-left shadow-sm">{m}</div>
                            ))}
                            {isFull && <div className="mt-1 flex justify-center"><CheckCircle2 size={14} className="text-green-500" /></div>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;