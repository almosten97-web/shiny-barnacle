import React from 'react';
import { Link } from 'react-router-dom';

const Schedules: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <Link to="/" style={{ textDecoration: 'none', color: '#1976d2', marginBottom: '20px', display: 'inline-block' }}>← Back to Dashboard</Link>
      <h1>Shift Schedules</h1>
      <p>View and manage all shift schedules here.</p>
      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <p>Schedule management features coming soon...</p>
      </div>
    </div>
  );
};

export default Schedules;
