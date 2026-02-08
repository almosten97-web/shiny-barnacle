
import React from 'react';

interface ManagerDashboardProps {
  employee: {
    id: string;
    full_name: string | null;
    email?: string | null;
    role: string;
  };
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ employee }) => {
  const displayName = employee.full_name?.trim() || 'there';

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-gray-800">Manager Dashboard</h2>
      <p className="mt-2 text-lg text-gray-600">Welcome, {displayName}!</p>
      <div className="mt-6 bg-white shadow-md rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-700">Your Information</h3>
        <p className="mt-2 text-gray-600"><strong>Email:</strong> {employee.email ?? 'Not available'}</p>
        <p className="text-gray-600"><strong>Role:</strong> {employee.role}</p>
      </div>
      {/* Placeholder for future features */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold text-gray-700">Actions</h3>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-200 p-6 rounded-lg text-center">
            <p className="font-semibold text-gray-600">(Coming Soon) Add Employee</p>
          </div>
          <div className="bg-gray-200 p-6 rounded-lg text-center">
            <p className="font-semibold text-gray-600">(Coming Soon) Manage Schedules</p>
          </div>
          <div className="bg-gray-200 p-6 rounded-lg text-center">
            <p className="font-semibold text-gray-600">(Coming Soon) View Reports</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
