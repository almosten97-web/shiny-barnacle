import React from 'react';

interface AdminDashboardProps {
    admin: any;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ admin }) => {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Welcome, {admin.full_name}!</p>
    </div>
  );
};

export default AdminDashboard;
