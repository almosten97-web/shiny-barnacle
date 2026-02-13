import React, { useState } from 'react';
import { supabase } from '../supabase';
import CreateClientForm from './CreateClientForm';
import VisitCalendarDashboard from './VisitCalendarDashboard';
import { invalidateCachedQuery, useCachedQuery } from '../lib/query-cache';
import RolesAccessPanel from './RolesAccessPanel';
import PendingClaimsPanel from './PendingClaimsPanel';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
}

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'shifts' | 'clients' | 'roles' | 'claims'>('shifts');
  const [lastNonCalendarTab, setLastNonCalendarTab] = useState<'clients' | 'roles' | 'claims'>('clients');

  const changeTab = (nextTab: 'shifts' | 'clients' | 'roles' | 'claims') => {
    if (nextTab !== 'shifts') {
      setLastNonCalendarTab(nextTab);
    }
    setActiveTab(nextTab);
  };

  const toggleFullCalendar = () => {
    if (activeTab === 'shifts') {
      setActiveTab(lastNonCalendarTab);
      return;
    }
    setActiveTab('shifts');
  };

  const {
    data: clients = [],
    isLoading: loadingClients,
    refetch,
  } = useCachedQuery<Client[]>({
    queryKey: ['admin-clients'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, phone, address')
        .eq('active', true)
        .order('last_name', { ascending: true });

      if (error) throw new Error(error.message);
      return (data || []) as Client[];
    },
  });

  const handleClientAdded = () => {
    invalidateCachedQuery(['admin-clients']);
    void refetch();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-emerald-50/50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold text-emerald-900">Charlene's Scheduling App</h1>
            <div className="mt-4 flex w-fit gap-2 rounded-xl bg-emerald-100/50 p-1">
              <button
                onClick={() => changeTab('shifts')}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                  activeTab === 'shifts' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-600 hover:text-emerald-700'
                }`}
              >
                Weekly Schedule
              </button>
              <button
                onClick={() => changeTab('clients')}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                  activeTab === 'clients' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-600 hover:text-emerald-700'
                }`}
              >
                Client Directory
              </button>
              <button
                onClick={() => changeTab('roles')}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                  activeTab === 'roles' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-600 hover:text-emerald-700'
                }`}
              >
                Roles & Access
              </button>
              <button
                onClick={() => changeTab('claims')}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                  activeTab === 'claims' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-600 hover:text-emerald-700'
                }`}
              >
                Pending Claims
              </button>
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={toggleFullCalendar}
              className={`mr-2 rounded-lg border px-3 py-2 text-xs font-semibold shadow-sm ${
                activeTab === 'shifts'
                  ? 'border-emerald-300 bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Full Calendar: {activeTab === 'shifts' ? 'On' : 'Off'}
            </button>
            <button
              type="button"
              onClick={() => {
                void handleLogout();
              }}
              className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50"
            >
              Log Out
            </button>
          </div>
        </header>

        {activeTab === 'clients' && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-emerald-50 p-6">
                  <h2 className="font-bold text-emerald-900">Active Clients</h2>
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">{clients.length} Total</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-emerald-50/50 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                      <tr>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Contact</th>
                        <th className="px-6 py-4">Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-50">
                      {loadingClients ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-emerald-400">
                            Loading directory...
                          </td>
                        </tr>
                      ) : (
                        clients.map((client) => (
                          <tr key={client.id} className="transition-colors hover:bg-emerald-50/30">
                            <td className="px-6 py-4 font-bold text-emerald-900">
                              {client.first_name} {client.last_name}
                            </td>
                            <td className="px-6 py-4 text-sm text-emerald-700">{client.phone || 'No phone'}</td>
                            <td className="max-w-[200px] truncate px-6 py-4 text-sm text-emerald-600">
                              {client.address || 'No address'}
                            </td>
                          </tr>
                        ))
                      )}
                      {clients.length === 0 && !loadingClients && (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center italic text-emerald-400">
                            No clients found. Use the form to add your first one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <aside>
              <CreateClientForm onClientAdded={handleClientAdded} />
            </aside>
          </div>
        )}

        {activeTab === 'shifts' && (
          <VisitCalendarDashboard
            title="Charlene's Scheduling App"
            subtitle="Admin perspective across all clients and caregivers"
            embedded
            allowShiftManagement
          />
        )}

        {activeTab === 'roles' && (
          <RolesAccessPanel />
        )}

        {activeTab === 'claims' && (
          <PendingClaimsPanel />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
