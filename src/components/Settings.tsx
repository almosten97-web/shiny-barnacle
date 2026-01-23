import React from 'react';
import { Link } from 'react-router-dom';

const Settings: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <Link to="/" style={{ textDecoration: 'none', color: '#1976d2', marginBottom: '20px', display: 'inline-block' }}>← Back to Dashboard</Link>
      <h1>System Settings</h1>
      <p>Configure system settings and preferences here.</p>
      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <p>Settings configuration features coming soon...</p>
      </div>
    </div>
  );
};

export default Settings;
