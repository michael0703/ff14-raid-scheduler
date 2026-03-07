import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Send, Plus, Clock, CheckCircle2, RefreshCw, Trash2, ShieldAlert, Lock, AlertTriangle, Users, Calendar, Trophy } from 'lucide-react';
import { supabase } from './supabaseClient';

// --- 配置區 ---
const ADMIN_PASSWORD = "ff14admin";
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
    days.push({ fullDate, displayDate: `${month}/${day}`, weekDay: weekNames[date.getDay()] });
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
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(null);

  const fetchAllData = useCallback(async (eventId, uName) => {
    if (!eventId) return;
    setIsFetching(true);
    try {
      const [groupRes, myRes] = await Promise.all([
        supabase.from('availability').select('user_name, slot_key').eq('event_id', eventId),
        uName ? supabase.from('availability').select('slot_key').eq('event_id', eventId).eq('user_name', uName) : { data: [] }
      ]);
      if (groupRes.error) throw groupRes.error;
      const formatted = {};
      const members = new Set();
      groupRes.data?.forEach(row => {
        members.add(row.user_name);
        if (!formatted[row.slot_key]) formatted[row.slot_key] = [];
        formatted[row.slot_key].push(row.user_name);
      });
      setAllTeamMembers(Array.from(members));
      setGroupData(formatted);
      setMyAvailability(new Set(myRes.data?.map(item => item.slot_key) || []));
    } catch (e) { console.error(e); } finally { setIsFetching(false); }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.from('events').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) { setEvents(data); setCurrentEventId(data[0].id); }
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (currentEventId) { setMyAvailability(new Set()); fetchAllData(currentEventId, userName); }
  }, [currentEventId, userName, fetchAllData]);

  const handleAddEvent = async () => {
    const name = window.prompt("請輸入副本名稱：");
    if (!name || !name.trim()) return;
    setIsFetching(true);
    try {
      const { data, error } = await supabase.from('events').insert([{ name: name.trim() }]).select();
      if (error) throw error;
      if (data) { setEvents(prev => [data[0], ...prev]); setCurrentEventId(data[0].id); }
    } catch (err) { alert(err.message); } finally { setIsFetching(false); }
  };

  const submitAvailability = async () => {
    if (!userName.trim() || !currentEventId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await supabase.from('availability').delete().match({ user_name: userName, event_id: currentEventId });
      if (myAvailability.size > 0) {
        const insertData = Array.from(myAvailability).map(slot => ({ user_name: userName, slot_key: slot, event_id: currentEventId }));
        const { error } = await supabase.from('availability').insert(insertData);
        if (error) throw error;
      }
      await fetchAllData(currentEventId, userName);
      alert("時間同步成功！");
    } catch (err) { alert(err.message); } finally { setIsSubmitting(false); }
  };

  const handleGlobalReset = async () => {
    const input = window.prompt("請輸入管理員密碼：");
    if (input !== ADMIN_PASSWORD) return alert("密碼錯誤");
    if (!window.confirm("確定全域重置資料嗎？")) return;
    setIsFetching(true);
    try {
      await supabase.from('availability').delete().neq('user_name', '_');
      await supabase.from('events').delete().neq('name', '_');
      const { data } = await supabase.from('events').insert([{ name: "請新增你想要打的本" }]).select();
      if (data) { setEvents(data); setCurrentEventId(data[0].id); setGroupData({}); setAllTeamMembers([]); }
    } finally { setIsFetching(false); }
  };

  const handleMouseDown = (slot) => {
    if (!userName.trim()) return;
    setIsDragging(true);
    const willSelect = !myAvailability.has(slot);
    setDragMode(willSelect ? 'select' : 'deselect');
    setMyAvailability(prev => {
      const next = new Set(prev);
      willSelect ? next.add(slot) : next.delete(slot);
      return next;
    });
  };

  // --- 關鍵優化：人數大於等於 4，且人數多者優先 ---
  const nextSession = useMemo(() => {
    const candidates = [];
    for (const d of DATES) {
      for (const t of TIMES) {
        const count = (groupData[`${d.fullDate}-${t}`] || []).length;
        // 條件：大於等於 4 人
        if (count >= 4) {
          candidates.push({
            date: `${d.displayDate} (${d.weekDay})`,
            time: t,
            count,
            rawDate: d.fullDate
          });
        }
      }
    }

    if (candidates.length === 0) return { status: 'none', msg: '目前暫無 4 人以上時段' };

    // 排序：1. 人數多優先 2. 日期早優先 3. 時間早優先
    const best = candidates.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (a.rawDate !== b.rawDate) return a.rawDate.localeCompare(b.rawDate);
      return a.time.localeCompare(b.time);
    })[0];

    return {
      ...best,
      label: best.count >= 8 ? '🔥 滿員發車' : '✨ 建議開組',
      isFull: best.count >= 8
    };
  }, [groupData]);

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 tracking-widest animate-pulse">FF14 RAID PLANNER...</div>;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 select-none pb-20 p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">

        {/* Header */}
        <header className="mb-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-4 flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200 text-white"><Calendar size={28} /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tighter">FF14 約戰助手</h1>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Smart Static Manager</p>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border-2 border-slate-200 shadow-sm transition-all hover:border-blue-200">
              <span className="text-[10px] font-black bg-blue-50 px-2.5 py-1.5 rounded-xl text-blue-600">副本</span>
              <select value={currentEventId || ''} onChange={(e) => setCurrentEventId(e.target.value)}
                className="bg-transparent flex-1 font-black text-slate-800 outline-none cursor-pointer text-sm">
                {events.length > 0 ? events.map(e => <option key={e.id} value={e.id}>{e.name}</option>) : <option disabled>請新增副本</option>}
              </select>
              <button onClick={handleAddEvent} className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 shadow-md transition-all active:scale-90"><Plus size={18} /></button>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className={`p-4 rounded-2xl text-center shadow-md border-2 transition-all duration-500 overflow-hidden relative ${nextSession.isFull ? 'bg-green-600 border-green-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
              {nextSession.date ? (
                <div className="flex items-center justify-between px-2 relative z-10">
                  <div className="text-left leading-none">
                    <span className={`text-[9px] font-black uppercase block mb-1 opacity-70`}>熱門出團首選</span>
                    <span className="text-base font-black tracking-tighter">{nextSession.date} {nextSession.time}</span>
                  </div>
                  <div className={`px-3 py-2 rounded-xl font-black text-[10px] shadow-sm flex items-center gap-1.5 ${nextSession.isFull ? 'bg-white text-green-700' : 'bg-blue-600 text-white'}`}>
                    {nextSession.isFull ? <Trophy size={12} /> : <Users size={12} />}
                    {nextSession.label} ({nextSession.count}人)
                  </div>
                </div>
              ) : <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">目前尚無滿足 4 人之時段</span>}
              {nextSession.isFull && <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start">

          {/* 左側：個人填寫 */}
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-200 shadow-xl shadow-slate-200/40 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-blue-600" />

              <div className="flex flex-col gap-5 mb-8">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">1. 填寫你的時間</h2>
                  <button onClick={() => setMyAvailability(new Set())} className="bg-slate-50 p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={20} /></button>
                </div>

                <div className="space-y-3">
                  <input type="text" placeholder="你的遊戲 ID..." value={userName}
                    onChange={(e) => { setUserName(e.target.value); localStorage.setItem('ff14_user_name', e.target.value); }}
                    className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-[1.2rem] font-black text-slate-700 placeholder:text-slate-300 focus:border-blue-500 focus:bg-white transition-all outline-none" />

                  <button onClick={submitAvailability} disabled={!userName.trim() || !currentEventId || isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-[1.2rem] font-black shadow-lg shadow-blue-200 active:scale-[0.97] transition-all flex items-center justify-center gap-3 disabled:bg-slate-200 disabled:shadow-none text-lg">
                    <Send size={20} /> {isSubmitting ? '同步中...' : '同步我的時間'}
                  </button>
                </div>
              </div>

              {/* 個人表格 */}
              <div className={`overflow-hidden rounded-[1.5rem] border-2 border-slate-100 transition-all ${(!userName.trim() || !currentEventId) ? 'opacity-20 grayscale pointer-events-none' : ''}`}>
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="py-5 border-r border-slate-700 w-16 text-[10px] font-black tracking-widest text-blue-400">TIME</th>
                      {DATES.map(d => (
                        <th key={d.fullDate} className="border-r border-slate-700 p-2">
                          <span className="block text-sm font-black">{d.displayDate}</span>
                          <span className="block text-[9px] opacity-50 uppercase tracking-tighter">{d.weekDay}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody onMouseLeave={() => setIsDragging(false)}>{TIMES.map(t => (
                    <tr key={t} className="group">
                      <td className="text-xs py-4 font-black border-r border-b border-slate-100 text-slate-900 bg-slate-50 group-hover:bg-blue-50 transition-colors">{t}</td>
                      {DATES.map(d => {
                        const s = `${d.fullDate}-${t}`;
                        const active = myAvailability.has(s);
                        return (
                          <td key={s} onMouseDown={() => handleMouseDown(s)}
                            onMouseEnter={() => isDragging && setMyAvailability(prev => { const n = new Set(prev); dragMode === 'select' ? n.add(s) : n.delete(s); return n; })}
                            className={`border-r border-b border-slate-100 h-14 cursor-pointer transition-all duration-75 relative ${active ? 'bg-blue-600' : 'hover:bg-blue-50/50'}`}>
                            {active && <CheckCircle2 size={16} className="text-white mx-auto animate-in zoom-in duration-200" />}
                          </td>
                        );
                      })}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 右側：團隊展示 */}
          <div className="xl:col-span-3 space-y-4">
            <div className="bg-white p-7 rounded-[2.5rem] border-2 border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-slate-200" />
              <h2 className="text-xl font-black text-slate-800 mb-8 flex items-center justify-between">
                2. 團隊目前分佈
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-3.5 py-1.5 rounded-xl uppercase tracking-widest font-black">已填寫: {allTeamMembers.length} 人</span>
                </div>
              </h2>
              <div className="overflow-x-auto rounded-[1.5rem] border-2 border-slate-100 bg-slate-50/30">
                <table className="w-full text-center border-collapse min-w-[750px]">
                  <thead>
                    <tr className="bg-white text-slate-400">
                      <th className="py-5 border-r border-slate-100 w-16 text-[10px] font-black tracking-widest">TIME</th>
                      {DATES.map(d => (
                        <th key={`g-${d.fullDate}`} className="border-r border-slate-100 p-2">
                          <span className="block text-sm font-black text-slate-800">{d.displayDate}</span>
                          <span className="block text-[9px] text-slate-400 uppercase tracking-tighter">{d.weekDay}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>{TIMES.map(t => (
                    <tr key={t}>
                      <td className="text-xs py-4 font-black border-r border-b border-slate-100 text-slate-300 bg-white font-mono">{t}</td>
                      {DATES.map(d => {
                        const users = groupData[`${d.fullDate}-${t}`] || [];
                        const isFull = users.length >= 8;
                        const isHot = users.length >= 4 && users.length < 8; // 更新顏色範圍
                        return (
                          <td key={`g-${d.fullDate}-${t}`} className={`border-r border-b border-slate-100 p-2 align-top min-h-[70px] transition-colors ${isFull ? 'bg-green-50/70' : isHot ? 'bg-blue-50/50' : 'bg-white'}`}>
                            <div className="flex flex-col gap-1.5">
                              {allTeamMembers.map(m => users.includes(m) && (
                                <div key={m} style={{ backgroundColor: getUserColor(m) }} className="px-2.5 py-1.5 rounded-xl text-[11px] text-white font-black truncate shadow-sm ring-1 ring-white/20 animate-in fade-in duration-300">{m}</div>
                              ))}
                              {isFull && <div className="mt-2 flex justify-center"><CheckCircle2 size={18} className="text-green-600 animate-bounce" /></div>}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>

            {/* 全域重置 */}
            <div className="pt-6 flex justify-end">
              <button onClick={handleGlobalReset} className="flex items-center gap-2.5 px-5 py-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all group border border-transparent hover:border-red-100">
                <Lock size={14} className="group-hover:hidden" />
                <AlertTriangle size={14} className="hidden group-hover:block" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Database Reset</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;