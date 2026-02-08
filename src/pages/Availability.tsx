import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';

interface AvailabilityRow {
  id: string;
  user_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string;
}

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const Availability: React.FC = () => {
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [formState, setFormState] = useState({
    user_id: '',
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const profileLookup = useMemo(() => {
    const map = new Map<string, ProfileRow>();
    profiles.forEach((profile) => map.set(profile.id, profile));
    return map;
  }, [profiles]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [availabilityResponse, profileResponse] = await Promise.all([
        supabase
          .from('availability')
          .select('id, user_id, day_of_week, start_time, end_time')
          .order('day_of_week', { ascending: true }),
        supabase
          .from('profiles')
          .select('id, full_name, email')
          .order('full_name', { ascending: true })
      ]);

      if (availabilityResponse.error) throw availabilityResponse.error;
      if (profileResponse.error) throw profileResponse.error;

      setAvailability(availabilityResponse.data ?? []);
      setProfiles(profileResponse.data ?? []);
    } catch (err: any) {
      setError(err.message || 'Failed to load availability.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const { error: insertError } = await supabase.from('availability').insert({
        user_id: formState.user_id || null,
        day_of_week: formState.day_of_week,
        start_time: formState.start_time,
        end_time: formState.end_time
      });

      if (insertError) throw insertError;
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save availability.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Availability</h2>
        <p className="text-sm text-slate-500">Capture team availability and preferred hours.</p>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {loading ? (
            <p className="text-sm text-slate-500">Loading availability...</p>
          ) : (
            <div className="space-y-3">
              {availability.map((item) => (
                <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {item.user_id ? profileLookup.get(item.user_id)?.full_name || profileLookup.get(item.user_id)?.email || 'Unknown' : 'Unassigned'}
                    </p>
                    <p className="text-xs text-slate-500">{days[item.day_of_week]}</p>
                  </div>
                  <p className="text-sm text-slate-600">{item.start_time} - {item.end_time}</p>
                </div>
              ))}
              {availability.length === 0 && <p className="text-sm text-slate-500">No availability logged yet.</p>}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Add availability</h3>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <select
              value={formState.user_id}
              onChange={(event) => setFormState({ ...formState, user_id: event.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              required
            >
              <option value="">Select staff member</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name || profile.email}
                </option>
              ))}
            </select>
            <select
              value={formState.day_of_week}
              onChange={(event) => setFormState({ ...formState, day_of_week: Number(event.target.value) })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {days.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="time"
                value={formState.start_time}
                onChange={(event) => setFormState({ ...formState, start_time: event.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <input
                type="time"
                value={formState.end_time}
                onChange={(event) => setFormState({ ...formState, end_time: event.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <button type="submit" className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              Save Availability
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Availability;
