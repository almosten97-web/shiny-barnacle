import React from 'react';
import { dashboardConfig } from '../dashboardConfig';
import AdminDashboard from './AdminDashboard';
import EmployeeDashboard from './EmployeeDashboard';
import NoRole from './NoRole';

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  role: string | null | undefined;
  is_admin?: boolean;
}

interface DashboardProps {
  profile: Profile | null | undefined;
  session?: any;
  isAdmin?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ profile, session, isAdmin = false }) => {
  // If there is no profile yet, show loading or fallback UI
  if (!profile) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading profile...</div>;
  }

  // Check admin status first - if user is marked as admin, render AdminDashboard
  if (isAdmin) {
    return (
      <AdminDashboard 
        admin={profile as any} 
      />
    );
  }

  // Otherwise, check role and render appropriate dashboard
  const role = profile.role && dashboardConfig[profile.role as keyof typeof dashboardConfig]
    ? (profile.role as keyof typeof dashboardConfig)
    : 'default';

  const DashboardComponent = dashboardConfig[role].component || dashboardConfig.default.component;

  return (
    <DashboardComponent
      id={profile.id}
      full_name={profile.full_name ?? 'Team Member'}
      role={profile.role ?? 'default'}
      employee={profile}
    />
  );
};

export default Dashboard;
