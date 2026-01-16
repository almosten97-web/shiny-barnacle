import React from 'react';

interface Profile {
  id: string;
  full_name: string;
  role: string;
}

interface EmployeeDashboardProps {
  employee: Profile;
}

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ employee }) => {
  return (
    <div>
      <h1>Employee Dashboard</h1>
      <p>Welcome, {employee.full_name}!</p>
    </div>
  );
};

export default EmployeeDashboard;
