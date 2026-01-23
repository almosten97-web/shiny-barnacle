import React from 'react';
import { Link } from 'react-router-dom';

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
            <li><Link to="/schedules" style={{ textDecoration: 'none', color: '#1976d2' }}>View all shift schedules</Link></li>          <li>Manage staff and roles</li>
            <li><Link to="/staff" style={{ textDecoration: 'none', color: '#1976d2' }}>Manage staff and roles</Link></li>          <li>View analytics and reports</li>
                      <li><Link to="/settings" style={{ textDecoration: 'none', color: '#1976d2' }}>Configure system settings</Link></li>
                      <li><Link to="/analytics" style={{ textDecoration: 'none', color: '#1976d2' }}>View analytics and reports</Link></li>
        </ul>
      </div>
    </div>
  );
};

export default AdminDashboard;
