import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Send, Plus, Clock, CheckCircle2, RefreshCw, Trash2, ShieldAlert } from 'lucide-react';
import { supabase } from './supabaseClient';

/**
 * 基礎配置：
 * TIMES: 早上 09:00 到 凌晨 00:00 (共 16 個時段)
 * DATES: 包含今天在內的未來七天
 */
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

/**
 * 根據名稱生成固定顏色，確保隊友顏色一致
 */
const getUserColor = (name) => {
  if (!name) return '#64748b';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash % 360)}, 65%, 40%)`;
};

function App() {
  // --- 狀態管理 ---
  const [events, setEvents] = useState([]);
  const [currentEventId, setCurrentEventId] = useState(null);
  const [userName, setUserName] = useState(localStorage.getItem('ff14_user_name') || '');
  const [myAvailability, setMyAvailability] = useState(new Set());
  const [groupData, setGroupData] = useState({});
  const [allTeamMembers, setAllTeamMembers] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [loading, setLoading] = useState(true);

  // 拖曳狀態
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState(null);

  // --- 1. 資料抓取邏輯 ---
  const fetchAllData = useCallback(async (eventId, uName) => {
    if (!eventId) return;
    setIsFetching(true);
    try {
      // 同時獲取全團分佈與個人勾選紀錄
      const [groupRes, myRes] = await Promise.all([
        supabase.from('availability').select('user_name, slot_key').eq('event_id', eventId),
        uName ? supabase.from('availability').select('slot_key').eq('event_id', eventId).eq('user_name', uName) : { data: [] }
      ]);

      if (groupRes.error) throw groupRes.error;

      // 格式化全團資料
      const formatted = {};
      const members = new Set();
      groupRes.data?.forEach(row => {
        members.add(row.user_name);
        if (!formatted[row.slot_key]) formatted[row.slot_key] = [];
        formatted[row.slot_key].push(row.user_name);
      });
      setAllTeamMembers(Array.from(members));
      setGroupData(formatted);

      // 更新個人狀態
      setMyAvailability(new Set(myRes.data?.map(item => item.slot_key) || []));

    } catch (e) {
      console.error("Fetch Data Error:", e);
    } finally {
      setIsFetching(false);
    }
  }, []);

  // 初始化載入
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.from('events').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) {
        setEvents(data);
        setCurrentEventId(data[0].id);
      }
      setLoading(false);
    };
    init();
  }, []);

  // 切換事件或名字時觸發重新整理
  useEffect(() => {
    if (currentEventId) {
      setMyAvailability(new Set()); // 先清空，防止殘影
      fetchAllData(currentEventId, userName);
    }
  }, [currentEventId, userName, fetchAllData]);

  // --- 2. 互動邏輯 ---

  const handleAddEvent = async () => {
    const name = window.prompt("請輸入副本/事件名稱：");
    if (!name || !name.trim()) return;

    setIsFetching(true);
    try {
      const { data, error } = await supabase.from('events').insert([{ name: name.trim() }]).select();
      if (error) throw error;
      if (data) {
        setEvents(prev => [data[0], ...prev]);
        setCurrentEventId(data[0].id);
      }
    } catch (err) {
      alert("新增失敗：" + err.message);
    } finally {
      setIsFetching(false);
    }
  };

  const submitAvailability = async () => {
    if (!userName.trim() || !currentEventId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      // 步驟一：刪除舊紀錄 (精準匹配事件與使用者)
      const { error: delError } = await supabase
        .from('availability')
        .delete()
        .match({ user_name: userName, event_id: currentEventId });

      if (delError) throw delError;

      // 步驟二：如果有點選格子，則批量插入新紀錄
      if (myAvailability.size > 0) {
        const insertData = Array.from(myAvailability).map(slot => ({
          user_name: userName,
          slot_key: slot,
          event_id: currentEventId
        }));

        const { error: insError } = await supabase.from('availability').insert(insertData);
        if (insError) throw insError;
      }

      await fetchAllData(currentEventId, userName);
      alert("時間已成功同步！");
    } catch (err) {
      console.error("Submit Error:", err);
      alert("同步失敗：" + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 3. 拖曳操作邏輯 ---
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

  useEffect(() => {
    const stopDrag = () => { setIsDragging(false); setDragMode(null); };
    window.addEventListener('mouseup', stopDrag);
    return () => window.removeEventListener('mouseup', stopDrag);
  }, []);

  // --- 4. 計算 8 人團時段 ---
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

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600">讀取中...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 select-none pb-20 p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">

        {/* Header 頂部導航 */}
        <header className="mb-8 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm items-center relative">
          {isFetching && <RefreshCw size={14} className="absolute top-4 right-6 text-blue-300 animate-spin" />}

          <div className="lg:col-span-3">
            <h1 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-3">
              <div className="w-1.5 h-6 bg-blue-600 rounded-full" /> FF14 約戰助手
            </h1>
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
              <select
                value={currentEventId || ''}
                onChange={(e) => setCurrentEventId(e.target.value)}
                className="bg-transparent py-1.5 pl-3 pr-8 font-bold outline-none text-blue-600 text-sm appearance-none cursor-pointer w-full"
              >
                {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <button onClick={handleAddEvent} className="bg-white text-blue-600 p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 transition-colors"><Plus size={14} /></button>
            </div>
          </div>

          <div className="lg:col-span-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">你的暱稱 (必填)</label>
            <input type="text" placeholder="輸入遊戲 ID..." value={userName}
              onChange={(e) => { setUserName(e.target.value); localStorage.setItem('ff14_user_name', e.target.value); }}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl font-bold outline-none focus:border-blue-400 transition-all" />
          </div>

          <div className="lg:col-span-3">
            <button onClick={submitAvailability} disabled={!userName.trim() || isSubmitting}
              className="w-full bg-blue-600 text-white py-3 rounded-2xl font-black shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:bg-slate-300">
              <Send size={16} /> {isSubmitting ? '同步中...' : '送出我的時間'}
            </button>
          </div>

          <div className="lg:col-span-3 bg-blue-50 border border-blue-100 p-4 rounded-2xl text-center shadow-inner">
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 block">自動計算結果</span>
            {nextSession.status === 'success' ? (
              <div className="animate-in fade-in duration-500">
                <div className="text-blue-700 font-black text-lg leading-tight">{nextSession.date}</div>
                <div className="text-blue-500 font-bold text-xs">{nextSession.time} 準時發車</div>
              </div>
            ) : <div className="text-slate-400 font-bold text-xs mt-1">{nextSession.msg}</div>}
          </div>
        </header>

        {/* 主要表格區域 */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">

          {/* 我的填寫區 */}
          <div className={`xl:col-span-2 ${!userName.trim() ? 'opacity-20 pointer-events-none' : ''}`}>
            <div className="flex justify-between items-center mb-4 px-2">
              <h2 className="text-[11px] font-black uppercase text-blue-600">1. 填寫你的有空時段 (可滑動)</h2>
              <button onClick={() => setMyAvailability(new Set())} className="text-slate-400 hover:text-red-400 transition-colors uppercase font-black text-[10px] flex items-center gap-1">
                <Trash2 size={12} /> 清空
              </button>
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
                      const active = myAvailability.has(s);
                      return (
                        <td key={s}
                          onMouseDown={() => handleMouseDown(s)}
                          onMouseEnter={() => isDragging && toggleSlot(s, dragMode === 'select')}
                          className={`border-r border-b h-11 cursor-pointer transition-all duration-75 ${active ? 'bg-blue-500/30 ring-1 ring-inset ring-blue-500' : 'hover:bg-slate-50'}`}
                        />
                      );
                    })}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>

          {/* 團隊成員分佈 */}
          <div className="xl:col-span-3">
            <h2 className="mb-4 text-[11px] font-black uppercase text-slate-500 ml-2">2. 團隊目前分佈 ({allTeamMembers.length}/8)</h2>
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full text-center border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-50 text-[10px] text-slate-400 font-black">
                    <th className="py-4 border-r border-b w-16">時段</th>
                    {DATES.map(d => <th key={`g-${d.fullDate}`} className="border-r border-b">{d.displayDate}<br />{d.weekDay}</th>)}
                  </tr>
                </thead>
                <tbody>{TIMES.map(t => (
                  <tr key={t}>
                    <td className="text-[9px] py-3 font-mono border-r border-b text-slate-300">{t}</td>
                    {DATES.map(d => {
                      const users = groupData[`${d.fullDate}-${t}`] || [];
                      const isFull = users.length >= 8;
                      return (
                        <td key={`g-${d.fullDate}-${t}`} className={`border-r border-b p-1 align-top min-h-[55px] ${isFull ? 'bg-green-50/50' : ''}`}>
                          <div className="flex flex-col gap-0.5">
                            {allTeamMembers.map(m => users.includes(m) && (
                              <div key={m} style={{ backgroundColor: getUserColor(m) }} className="px-2 py-0.5 rounded text-[8px] text-white font-bold truncate text-left shadow-sm">
                                {m}
                              </div>
                            ))}
                            {isFull && <div className="mt-1 flex justify-center"><CheckCircle2 size={12} className="text-green-500" /></div>}
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

        {/* 測試重置功能 */}
        <div className="mt-12 text-center">
          <button onClick={async () => {
            if (window.confirm("確定清空「目前這個事件」的所有隊友資料嗎？")) {
              await supabase.from('availability').delete().eq('event_id', currentEventId);
              fetchAllData(currentEventId, userName);
            }
          }} className="text-[9px] font-black text-slate-300 hover:text-red-400 transition-colors uppercase tracking-[0.2em] flex items-center justify-center gap-1 mx-auto">
            <ShieldAlert size={12} /> Admin Reset Currently Selected Event
          </button>
        </div>

      </div>
    </div>
  );
}

export default App;