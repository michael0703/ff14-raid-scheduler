import { supabase } from '../supabaseClient';

const ADAPTER = import.meta.env.VITE_DB_ADAPTER || 'supabase';
const IS_LOCAL = ADAPTER === 'local';

export const dataService = {
  // Fetch all material counts
  async fetchAllCounts() {
    if (IS_LOCAL) {
      console.log('[DataService] Using LocalStorage (Offline Mode)');
      const saved = localStorage.getItem('submarine_gathered_counts');
      return saved ? JSON.parse(saved) : {};
    }

    try {
      const { data, error } = await supabase.from('submarine_gathered').select('*');
      if (error) throw error;
      const counts = {};
      data.forEach(row => {
        counts[row.name] = row.count;
      });
      return counts;
    } catch (err) {
      console.error('[DataService] Supabase fetch failed:', err);
      return {};
    }
  },

  // Update a single count
  async updateCount(name, count) {
    if (IS_LOCAL) {
      const saved = localStorage.getItem('submarine_gathered_counts');
      const counts = saved ? JSON.parse(saved) : {};
      counts[name] = count;
      localStorage.setItem('submarine_gathered_counts', JSON.stringify(counts));
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('submarine_gathered')
        .upsert({ name, count }, { onConflict: 'name' });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('[DataService] Supabase update failed:', err);
      return { success: false, error: err };
    }
  },

  // Bulk update (for reset)
  async bulkUpdate(updates) {
    if (IS_LOCAL) {
      const counts = {};
      updates.forEach(u => { counts[u.name] = u.count; });
      localStorage.setItem('submarine_gathered_counts', JSON.stringify(counts));
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('submarine_gathered')
        .upsert(updates, { onConflict: 'name' });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('[DataService] Supabase bulk update failed:', err);
      return { success: false, error: err };
    }
  },

  // Subscribe to real-time changes
  subscribe(callback) {
    if (IS_LOCAL) return () => {}; // No real-time for local

    const channel = supabase
      .channel('submarine_realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'submarine_gathered' }, 
        (payload) => {
          if (payload.new) {
            callback(payload.new.name, payload.new.count);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
