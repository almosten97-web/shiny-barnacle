
import React from 'react';

const NoRole: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="p-8 bg-white shadow-md rounded-lg text-center">
        <h2 className="text-2xl font-bold text-gray-800">Account Pending Approval</h2>
        <p className="mt-4 text-gray-600">Your account has been created but requires administrator approval before you can access the dashboard. Please check back later.</p>
      </div>
    </div>
  );
};

export default NoRole;
