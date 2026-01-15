import React from 'react';

interface EmployeeDashboardProps {
    employee: any;
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
