import React from 'react';

const NoRole: React.FC = () => {
  return (
    <div className="min-h-screen bg-emerald-50/50 p-6">
      <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-500">Charleen's Scheduling App</p>
        <h1 className="mt-2 text-2xl font-bold text-emerald-900">Waiting for Approval</h1>
        <p className="mt-2 text-sm text-emerald-700">Your account has been created but needs to be approved by an administrator.</p>
      </div>
    </div>
  );
};

export default NoRole;
