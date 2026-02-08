import React from 'react';

interface Profile {
  id: string;
  full_name: string | null;
  email?: string;
  role: string;
}

interface EmployeeDashboardProps {
  employee: Profile;
}

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ employee }) => {
  const displayName = employee.full_name?.trim() || 'there';

  return (
    <div style={{ padding: '20px' }}>
      <h1>Employee Dashboard</h1>
      <p>Welcome, {displayName}!</p>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
        <p>Role: <strong>{employee.role}</strong></p>
        <p>User ID: {employee.id}</p>
      </div>
      <div style={{ marginTop: '20px' }}>
        <h3>Available Actions:</h3>
        <ul>
          <li>View your shift schedule</li>
          <li>Request shift changes</li>
          <li>View work history</li>
        </ul>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
