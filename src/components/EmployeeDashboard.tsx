
import React from 'react';

interface EmployeeDashboardProps {
  employee: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ employee }) => {
  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-gray-800">Employee Dashboard</h2>
      <p className="mt-2 text-lg text-gray-600">Welcome, {employee.name}!</p>
      <div className="mt-6 bg-white shadow-md rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-700">Your Information</h3>
        <p className="mt-2 text-gray-600"><strong>Email:</strong> {employee.email}</p>
        <p className="text-gray-600"><strong>Role:</strong> {employee.role}</p>
      </div>
      <div className="mt-8">
        <h3 className="text-xl font-semibold text-gray-700">Your Schedule</h3>
        <div className="mt-4 bg-gray-200 p-6 rounded-lg text-center">
            <p className="font-semibold text-gray-600">(Coming Soon) View Your Schedule</p>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
