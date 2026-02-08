import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  active: boolean | null;
}

const Clients: React.FC = () => {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [formState, setFormState] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('id, first_name, last_name, phone, address, notes, active')
        .order('last_name', { ascending: true });

      if (fetchError) throw fetchError;
      setClients(data ?? []);
    } catch (err: any) {
      setError(err.message || 'Failed to load clients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const { error: insertError } = await supabase.from('clients').insert({
        first_name: formState.first_name,
        last_name: formState.last_name,
        phone: formState.phone || null,
        address: formState.address || null,
        active: true
      });

      if (insertError) throw insertError;
      setFormState({ first_name: '', last_name: '', phone: '', address: '' });
      await loadClients();
    } catch (err: any) {
      setError(err.message || 'Failed to add client.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Clients</h2>
        <p className="text-sm text-slate-500">Manage your client roster and assignments.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {loading ? (
            <p className="text-sm text-slate-500">Loading clients...</p>
          ) : (
            <div className="space-y-4">
              {clients.map((client) => (
                <div key={client.id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-none last:pb-0">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {client.first_name} {client.last_name}
                    </p>
                    <p className="text-xs text-slate-500">{client.phone || 'No phone'} · {client.address || 'No address'}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${client.active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>
                    {client.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Add client</h3>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="First name"
              value={formState.first_name}
              onChange={(event) => setFormState({ ...formState, first_name: event.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              required
            />
            <input
              type="text"
              placeholder="Last name"
              value={formState.last_name}
              onChange={(event) => setFormState({ ...formState, last_name: event.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              required
            />
            <input
              type="text"
              placeholder="Phone"
              value={formState.phone}
              onChange={(event) => setFormState({ ...formState, phone: event.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Address"
              value={formState.address}
              onChange={(event) => setFormState({ ...formState, address: event.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button type="submit" className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              Save Client
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Clients;
