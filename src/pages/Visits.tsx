import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';

interface VisitRow {
  id: string;
  client_id: string | null;
  caregiver_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
}

interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string;
}

const Visits: React.FC = () => {
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [caregivers, setCaregivers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    client_id: '',
    caregiver_id: '',
    start_time: '',
    end_time: '',
    notes: ''
  });

  const clientLookup = useMemo(() => {
    const map = new Map<string, ClientRow>();
    clients.forEach((client) => map.set(client.id, client));
    return map;
  }, [clients]);

  const caregiverLookup = useMemo(() => {
    const map = new Map<string, ProfileRow>();
    caregivers.forEach((profile) => map.set(profile.id, profile));
    return map;
  }, [caregivers]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [visitResponse, clientResponse, caregiverResponse] = await Promise.all([
        supabase
          .from('visits')
          .select('id, client_id, caregiver_id, start_time, end_time, status, notes')
          .order('start_time', { ascending: true }),
        supabase
          .from('clients')
          .select('id, first_name, last_name')
          .order('last_name', { ascending: true }),
        supabase
          .from('profiles')
          .select('id, full_name, email')
          .order('full_name', { ascending: true })
      ]);

      if (visitResponse.error) throw visitResponse.error;
      if (clientResponse.error) throw clientResponse.error;
      if (caregiverResponse.error) throw caregiverResponse.error;

      setVisits(visitResponse.data ?? []);
      setClients(clientResponse.data ?? []);
      setCaregivers(caregiverResponse.data ?? []);
    } catch (err: any) {
      setError(err.message || 'Failed to load visits.');
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
      const { error: insertError } = await supabase.from('visits').insert({
        client_id: formState.client_id || null,
        caregiver_id: formState.caregiver_id || null,
        start_time: formState.start_time,
        end_time: formState.end_time,
        status: 'open',
        notes: formState.notes || null
      });

      if (insertError) throw insertError;
      setFormState({ client_id: '', caregiver_id: '', start_time: '', end_time: '', notes: '' });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create visit.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Visits</h2>
        <p className="text-sm text-slate-500">Track client visits and coverage details.</p>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {loading ? (
            <p className="text-sm text-slate-500">Loading visits...</p>
          ) : (
            <div className="space-y-4">
              {visits.map((visit) => {
                const client = visit.client_id ? clientLookup.get(visit.client_id) : null;
                const caregiver = visit.caregiver_id ? caregiverLookup.get(visit.caregiver_id) : null;

                return (
                  <div key={visit.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {client ? `${client.first_name} ${client.last_name}` : 'Unknown Client'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(visit.start_time).toLocaleString()} - {new Date(visit.end_time).toLocaleString()}
                        </p>
                      </div>
                      <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                        {visit.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      Caregiver: {caregiver?.full_name || caregiver?.email || 'Unassigned'}
                    </p>
                    {visit.notes && <p className="mt-1 text-sm text-slate-500">{visit.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Log visit</h3>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <select
              value={formState.client_id}
              onChange={(event) => setFormState({ ...formState, client_id: event.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              required
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.first_name} {client.last_name}
                </option>
              ))}
            </select>
            <select
              value={formState.caregiver_id}
              onChange={(event) => setFormState({ ...formState, caregiver_id: event.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Assign caregiver</option>
              {caregivers.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name || profile.email}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={formState.start_time}
              onChange={(event) => setFormState({ ...formState, start_time: event.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              required
            />
            <input
              type="datetime-local"
              value={formState.end_time}
              onChange={(event) => setFormState({ ...formState, end_time: event.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              required
            />
            <textarea
              placeholder="Notes"
              value={formState.notes}
              onChange={(event) => setFormState({ ...formState, notes: event.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              rows={3}
            />
            <button type="submit" className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              Save Visit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Visits;
