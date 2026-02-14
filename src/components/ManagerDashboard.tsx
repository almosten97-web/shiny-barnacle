import React, { useState } from 'react';
import { supabase } from '../supabase';
import VisitCalendarDashboard from './VisitCalendarDashboard';
import RolesAccessPanel from './RolesAccessPanel';
import PendingClaimsPanel from './PendingClaimsPanel';

interface ManagerDashboardProps {
  manager: {
    id: string;
    full_name: string;
    email: string;
    role: 'manager';
  };
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ manager }) => {
  const [activeTab, setActiveTab] = useState<'shifts' | 'roles' | 'claims'>('shifts');
  const [lastNonCalendarTab, setLastNonCalendarTab] = useState<'roles' | 'claims'>('roles');

  const changeTab = (nextTab: 'shifts' | 'roles' | 'claims') => {
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-emerald-50/50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold text-emerald-900">Charleen's Scheduling App</h1>
            <p className="mt-1 text-sm text-emerald-700">Manager view: {manager.full_name} ({manager.email})</p>
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

        {activeTab === 'shifts' && (
          <VisitCalendarDashboard
            title="Charleen's Scheduling App"
            subtitle={`Manager view: ${manager.full_name} (${manager.email})`}
            embedded
            allowShiftManagement
          />
        )}

        {activeTab === 'roles' && <RolesAccessPanel />}
        {activeTab === 'claims' && <PendingClaimsPanel />}
      </div>
    </div>
  );
};

export default ManagerDashboard;
