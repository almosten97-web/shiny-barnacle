import React from 'react';
import { Link } from 'react-router-dom';

const Staff: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <Link to="/" style={{ textDecoration: 'none', color: '#1976d2', marginBottom: '20px', display: 'inline-block' }}>← Back to Dashboard</Link>
      <h1>Staff Management</h1>
      <p>Manage staff members and their roles here.</p>
      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <p>Staff management features coming soon...</p>
      </div>
    </div>
  );
};

export default Staff;
