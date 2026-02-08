import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

interface StaffRow {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  active: boolean | null;
  is_admin: boolean | null;
}

const Staff: React.FC = () => {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, active, is_admin')
        .order('full_name', { ascending: true });

      if (fetchError) throw fetchError;
      setStaff(data ?? []);
    } catch (err: any) {
      setError(err.message || 'Failed to load staff.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const updateStaff = async (id: string, updates: Partial<StaffRow>) => {
    const { error: updateError } = await supabase.from('profiles').update(updates).eq('id', id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await loadStaff();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Staff</h2>
        <p className="text-sm text-slate-500">Manage team roles and access permissions.</p>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-500">Loading staff...</p>
        ) : (
          <div className="space-y-4">
            {staff.map((member) => (
              <div key={member.id} className="flex flex-col gap-3 border-b border-slate-100 pb-4 last:border-none last:pb-0 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{member.full_name || member.email}</p>
                  <p className="text-xs text-slate-500">{member.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={member.role}
                    onChange={(event) => updateStaff(member.id, { role: event.target.value })}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                  <label className="flex items-center gap-2 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      checked={member.active ?? false}
                      onChange={(event) => updateStaff(member.id, { active: event.target.checked })}
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      checked={member.is_admin ?? false}
                      onChange={(event) => updateStaff(member.id, { is_admin: event.target.checked })}
                    />
                    Admin
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Staff;
