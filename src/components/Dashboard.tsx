import React from 'react';
import { dashboardConfig } from '../dashboardConfig';

interface Profile {
  id: string;
  full_name: string;
  role: string | null | undefined;
}

interface DashboardProps {
  profile: Profile | null | undefined;
}

const Dashboard: React.FC<DashboardProps> = ({ profile }) => {
  // If there is no profile yet, show loading or fallback UI
  if (!profile) {
    return <div>Loading profile...</div>;
  }

  // Safely normalize the role
  const role =
    profile.role && dashboardConfig[profile.role as keyof typeof dashboardConfig]
      ? (profile.role as keyof typeof dashboardConfig)
      : 'default';

  const DashboardComponent =
    dashboardConfig[role].component || dashboardConfig.default.component;

  // Pass props explicitly instead of spreading, so children don't assume things that might be missing
  return (
    <DashboardComponent
      id={profile.id}
      full_name={profile.full_name}
      role={profile.role ?? 'default'}
    />
  );
};

export default Dashboard;
