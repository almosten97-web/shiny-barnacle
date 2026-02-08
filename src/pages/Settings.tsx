import React from 'react';

const Settings: React.FC = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Settings</h2>
      <p className="text-sm text-slate-500">System preferences and configuration will live here.</p>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">No settings configured yet.</p>
      </div>
    </div>
  );
};

export default Settings;
