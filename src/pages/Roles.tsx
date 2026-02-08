import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';

interface RoleRow {
  id: string;
  name: string;
  description: string | null;
}

interface UserRoleRow {
  id: string;
  user_id: string;
  role_id: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string;
}

const Roles: React.FC = () => {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [userRoles, setUserRoles] = useState<UserRoleRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });
  const [assignForm, setAssignForm] = useState({ user_id: '', role_id: '' });
  const [error, setError] = useState<string | null>(null);

  const profileLookup = useMemo(() => {
    const map = new Map<string, ProfileRow>();
    profiles.forEach((profile) => map.set(profile.id, profile));
    return map;
  }, [profiles]);

  const roleLookup = useMemo(() => {
    const map = new Map<string, RoleRow>();
    roles.forEach((role) => map.set(role.id, role));
    return map;
  }, [roles]);

  const loadData = async () => {
    setError(null);
    try {
      const [roleResponse, userRoleResponse, profileResponse] = await Promise.all([
        supabase.from('roles').select('id, name, description').order('name', { ascending: true }),
        supabase.from('user_roles').select('id, user_id, role_id').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, email').order('full_name', { ascending: true })
      ]);

      if (roleResponse.error) throw roleResponse.error;
      if (userRoleResponse.error) throw userRoleResponse.error;
      if (profileResponse.error) throw profileResponse.error;

      setRoles(roleResponse.data ?? []);
      setUserRoles(userRoleResponse.data ?? []);
      setProfiles(profileResponse.data ?? []);
    } catch (err: any) {
      setError(err.message || 'Failed to load roles.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createRole = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const { error: insertError } = await supabase.from('roles').insert({
        name: roleForm.name,
        description: roleForm.description || null
      });
      if (insertError) throw insertError;
      setRoleForm({ name: '', description: '' });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create role.');
    }
  };

  const assignRole = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const { error: insertError } = await supabase.from('user_roles').insert({
        user_id: assignForm.user_id,
        role_id: assignForm.role_id
      });
      if (insertError) throw insertError;
      setAssignForm({ user_id: '', role_id: '' });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to assign role.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Roles & Access</h2>
        <p className="text-sm text-slate-500">Define roles and assign access to team members.</p>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Role assignments</h3>
          <div className="mt-4 space-y-3">
            {userRoles.map((userRole) => {
              const profile = profileLookup.get(userRole.user_id);
              const role = roleLookup.get(userRole.role_id);

              return (
                <div key={userRole.id} className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {profile?.full_name || profile?.email || 'Unknown'}
                  </p>
                  <p className="text-xs text-slate-500">Role: {role?.name || 'Unknown'}</p>
                </div>
              );
            })}
            {userRoles.length === 0 && <p className="text-sm text-slate-500">No role assignments yet.</p>}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Create role</h3>
            <form className="mt-4 space-y-4" onSubmit={createRole}>
              <input
                type="text"
                placeholder="Role name"
                value={roleForm.name}
                onChange={(event) => setRoleForm({ ...roleForm, name: event.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                required
              />
              <input
                type="text"
                placeholder="Description"
                value={roleForm.description}
                onChange={(event) => setRoleForm({ ...roleForm, description: event.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <button type="submit" className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Save Role
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Assign role</h3>
            <form className="mt-4 space-y-4" onSubmit={assignRole}>
              <select
                value={assignForm.user_id}
                onChange={(event) => setAssignForm({ ...assignForm, user_id: event.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                required
              >
                <option value="">Select staff member</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.full_name || profile.email}
                  </option>
                ))}
              </select>
              <select
                value={assignForm.role_id}
                onChange={(event) => setAssignForm({ ...assignForm, role_id: event.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                required
              >
                <option value="">Select role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <button type="submit" className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Assign Role
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Roles;
