import React from 'react';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  is_admin?: boolean;
}

interface AdminDashboardProps {
  admin: Profile;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ admin }) => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Admin Dashboard</h1>
      <p>Welcome, {admin.full_name}!</p>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
        <p><strong>Admin Access Confirmed</strong></p>
        <p>is_admin: {admin.is_admin === true ? 'true' : 'false'}</p>
        <p>User ID: {admin.id}</p>
      </div>
      <div style={{ marginTop: '20px' }}>
        <h3>Admin Features:</h3>
        <ul>
          <li>View all shift schedules</li>
          <li>Manage staff and roles</li>
          <li>Configure system settings</li>
          <li>View analytics and reports</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminDashboard;
