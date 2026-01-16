import React from 'react';
import { dashboardConfig } from '../dashboardConfig';

interface Profile {
  id: string;
  full_name: string;
  role: string;
}

interface DashboardProps {
  profile: Profile;
}

const Dashboard: React.FC<DashboardProps> = ({ profile }) => {
  const DashboardComponent =
    dashboardConfig[profile.role as keyof typeof dashboardConfig]?.component ||
    dashboardConfig.default.component;

  return <DashboardComponent {...profile} />;
};

export default Dashboard;
