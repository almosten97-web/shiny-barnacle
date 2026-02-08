import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';

interface ShiftRow {
  id: string;
  start_time: string;
  end_time: string;
  assigned_user_id: string | null;
  status: 'open' | 'assigned' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string | null;
  shift_requests?: { id: string; user_id: string | null; status: string }[] | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string;
}

const statusStyles: Record<ShiftRow['status'], string> = {
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  assigned: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200'
};

const Schedule: React.FC = () => {
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    start_time: '',
    end_time: '',
    assigned_user_id: '',
    notes: ''
  });

  const profileLookup = useMemo(() => {
    const map = new Map<string, ProfileRow>();
    profiles.forEach((profile) => map.set(profile.id, profile));
    return map;
  }, [profiles]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [shiftResponse, profileResponse] = await Promise.all([
        supabase
          .from('shifts')
          .select('id, start_time, end_time, assigned_user_id, status, notes, created_at, shift_requests(id, user_id, status)')
          .order('start_time', { ascending: true }),
        supabase
          .from('profiles')
          .select('id, full_name, email')
          .order('full_name', { ascending: true })
      ]);

      if (shiftResponse.error) throw shiftResponse.error;
      if (profileResponse.error) throw profileResponse.error;

      setShifts(shiftResponse.data ?? []);
      setProfiles(profileResponse.data ?? []);
    } catch (err: any) {
      setError(err.message || 'Failed to load shifts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const assignedId = formState.assigned_user_id || null;

      const { error: insertError } = await supabase.from('shifts').insert({
        start_time: formState.start_time,
        end_time: formState.end_time,
        assigned_user_id: assignedId,
        assigned_to: assignedId,
        status: assignedId ? 'assigned' : 'open',
        notes: formState.notes || null,
        created_by: authData.user?.id || null
      });

      if (insertError) throw insertError;

      setIsModalOpen(false);
      setFormState({ start_time: '', end_time: '', assigned_user_id: '', notes: '' });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create shift.');
    }
  };

  const handleRequestShift = async (shiftId: string, isOpen: boolean, alreadyRequested: boolean) => {
    if (!isOpen || alreadyRequested) return;
    setError(null);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error('You must be logged in to request a shift.');

      const { error: insertError } = await supabase.from('shift_requests').insert({
        shift_id: shiftId,
        user_id: authData.user.id,
        status: 'pending'
      });

      if (insertError) throw insertError;
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to request shift.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Schedule</h2>
          <p className="text-sm text-slate-500">Coordinate shifts and track coverage in real time.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          Create New Shift
        </button>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Loading shifts...
          </div>
        )}

        {!loading && shifts.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No shifts scheduled yet.
          </div>
        )}

        {shifts.map((shift) => {
          const assignedProfile = shift.assigned_user_id ? profileLookup.get(shift.assigned_user_id) : null;
          const displayName = assignedProfile?.full_name || assignedProfile?.email || 'Unassigned';
          const requestCount = shift.shift_requests?.length ?? 0;
          const alreadyRequested = !!currentUserId && !!shift.shift_requests?.some((req) => req.user_id === currentUserId);
          const isOpen = shift.status === 'open';

          return (
            <div key={shift.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(shift.start_time).toLocaleString()} - {new Date(shift.end_time).toLocaleString()}
                  </p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusStyles[shift.status]}`}>
                  {shift.status}
                </span>
              </div>
              {shift.notes && <p className="mt-3 text-sm text-slate-600">{shift.notes}</p>}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-slate-500">{requestCount} request(s)</p>
                {isOpen && (
                  <button
                    type="button"
                    onClick={() => handleRequestShift(shift.id, isOpen, alreadyRequested)}
                    disabled={alreadyRequested}
                    className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {alreadyRequested ? 'Requested' : 'Request Shift'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">New Shift</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full px-3 py-1 text-sm text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Start</label>
                  <input
                    type="datetime-local"
                    value={formState.start_time}
                    onChange={(event) => setFormState({ ...formState, start_time: event.target.value })}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">End</label>
                  <input
                    type="datetime-local"
                    value={formState.end_time}
                    onChange={(event) => setFormState({ ...formState, end_time: event.target.value })}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Assign to</label>
                <select
                  value={formState.assigned_user_id}
                  onChange={(event) => setFormState({ ...formState, assigned_user_id: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Notes</label>
                <textarea
                  value={formState.notes}
                  onChange={(event) => setFormState({ ...formState, notes: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Save Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
