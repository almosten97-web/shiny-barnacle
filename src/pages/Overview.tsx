import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

const Overview: React.FC = () => {
  const [stats, setStats] = useState({
    openShifts: 0,
    activeStaff: 0,
    activeClients: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadStats = async () => {
      setLoading(true);
      const [{ count: openShifts }, { count: activeStaff }, { count: activeClients }] = await Promise.all([
        supabase.from('shifts').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('active', true)
      ]);

      if (!active) return;
      setStats({
        openShifts: openShifts ?? 0,
        activeStaff: activeStaff ?? 0,
        activeClients: activeClients ?? 0
      });
      setLoading(false);
    };

    loadStats();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
        <p className="text-sm text-slate-500">A snapshot of today’s workforce activity.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Open shifts', value: stats.openShifts },
          { label: 'Active staff', value: stats.activeStaff },
          { label: 'Active clients', value: stats.activeClients }
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">
              {loading ? '...' : item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900">Keep schedules tight</h3>
        <p className="mt-2 text-sm text-slate-500">
          Review open shifts, confirm requests, and keep your team aligned with the latest coverage needs.
        </p>
      </div>
    </div>
  );
};

export default Overview;
