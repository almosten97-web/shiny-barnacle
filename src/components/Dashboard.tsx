import React from 'react';
import AdminDashboard from './AdminDashboard';
import ManagerDashboard from './ManagerDashboard';
import VisitCalendarDashboard from './VisitCalendarDashboard';

interface Profile {
  id: string;
  full_name: string;
  role: string | null | undefined;
  is_admin?: boolean;
}

interface DashboardProps {
  profile: Profile | null | undefined;
  session?: any;
  isAdmin?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ profile, session, isAdmin = false }) => {
  // 1. Safety Check: Loading State
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-emerald-50">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-emerald-900 font-medium">Syncing your profile...</p>
        </div>
      </div>
    );
  }

  const normalizedRole = (profile.role || '').toLowerCase();

  /**
   * ROUTING LOGIC
   * We prioritize explicit admin status, then manager roles, 
   * then fall back to standard caregiver (employee) views.
   */

  // 2. Admin View (Full system control)
  if (isAdmin || profile.is_admin || normalizedRole === 'admin') {
    return (
      <AdminDashboard 
        admin={{
          id: profile.id,
          full_name: profile.full_name,
          email: session?.user?.email
        }}
      />
    );
  }

  // 3. Manager View (Shift creation & Client management)
  if (normalizedRole === 'manager') {
    return (
      <ManagerDashboard
        manager={{
          id: profile.id,
          full_name: profile.full_name,
          email: session?.user?.email ?? 'manager@example.com',
          role: 'manager',
        }}
      />
    );
  }

  // 4. All other authenticated users default to caregiver calendar view.
  return (
    <VisitCalendarDashboard
      title="Charlene's Scheduling App"
      subtitle={`Caregiver view: ${profile.full_name}`}
      lockedPerspective="caregiver"
      lockedCaregiverId={profile.id}
    />
  );
};

export default Dashboard;
