import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

interface AppShellProps {
  profile: {
    full_name: string | null;
    email: string;
    role: string;
    is_admin?: boolean;
  };
}

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/schedule', label: 'Schedule' },
  { to: '/staff', label: 'Staff' },
  { to: '/clients', label: 'Clients' },
  { to: '/visits', label: 'Visits' },
  { to: '/requests', label: 'Requests' },
  { to: '/availability', label: 'Availability' },
  { to: '/roles', label: 'Roles & Access' },
  { to: '/settings', label: 'Settings' }
];

const AppShell: React.FC<AppShellProps> = ({ profile }) => {
  const displayName = profile.full_name?.trim() || profile.email || 'Team Member';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white px-6 py-6 md:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white font-semibold">
              HB
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">HomeBase Style</p>
              <p className="text-xs text-slate-500">Flexible Scheduling</p>
            </div>
          </div>

          <nav className="mt-10 flex flex-col gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  [
                    'rounded-xl px-4 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl bg-slate-100 p-4">
            <p className="text-xs text-slate-500">Signed in as</p>
            <p className="text-sm font-semibold text-slate-900">{displayName}</p>
            <p className="text-xs text-slate-500 capitalize">{profile.role}</p>
          </div>
        </aside>

        <main className="flex-1">
          <div className="border-b border-slate-200 bg-white px-6 py-4 md:px-10">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Workforce</p>
                <h1 className="text-2xl font-semibold text-slate-900">Flexible Scheduling</h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  {profile.is_admin ? 'Admin' : 'Member'}
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2 md:hidden">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    [
                      'whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition',
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="px-6 py-8 md:px-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
