import React, { useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { invalidateCachedQuery, useCachedQuery } from '../lib/query-cache';
import { mapDataError } from '../lib/error-mapping';

type RoleValue = 'employee' | 'manager' | 'admin';

interface AccessProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  is_admin: boolean | null;
}

interface InviteRecord {
  id: string;
  email: string;
  full_name: string;
  role: string;
  invite_token: string;
  status: string;
  created_at: string;
}

const queryKey = ['access-users'] as const;
const invitesQueryKey = ['caregiver-invites'] as const;

const toRoleValue = (profile: AccessProfile): RoleValue => {
  if (profile.is_admin) return 'admin';
  if ((profile.role || '').toLowerCase() === 'manager') return 'manager';
  return 'employee';
};

const RolesAccessPanel: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [pendingRoles, setPendingRoles] = useState<Record<string, RoleValue>>({});
  const [pendingNames, setPendingNames] = useState<Record<string, string>>({});
  const [pendingEmails, setPendingEmails] = useState<Record<string, string>>({});
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<RoleValue>('employee');
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const {
    data: users = [],
    isLoading,
    refetch,
  } = useCachedQuery<AccessProfile[]>({
    queryKey,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, is_admin')
        .order('full_name', { ascending: true });

      if (queryError) throw new Error(queryError.message);
      return (data || []) as AccessProfile[];
    },
  });

  const {
    data: invites = [],
    isLoading: loadingInvites,
    refetch: refetchInvites,
  } = useCachedQuery<InviteRecord[]>({
    queryKey: invitesQueryKey,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from('caregiver_invites')
        .select('id, email, full_name, role, invite_token, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (queryError) throw new Error(queryError.message);
      return (data || []) as InviteRecord[];
    },
  });

  const currentRoles = useMemo(() => {
    const mapped: Record<string, RoleValue> = {};
    users.forEach((user) => {
      mapped[user.id] = toRoleValue(user);
    });
    return mapped;
  }, [users]);

  const getSelectedRole = (user: AccessProfile): RoleValue => pendingRoles[user.id] || currentRoles[user.id] || 'employee';
  const getSelectedName = (user: AccessProfile): string => pendingNames[user.id] ?? user.full_name ?? '';
  const getSelectedEmail = (user: AccessProfile): string => pendingEmails[user.id] ?? user.email ?? '';

  const buildInviteLink = (inviteToken: string, email: string): string => {
    const params = new URLSearchParams();
    params.set('invite', inviteToken);
    params.set('email', email);
    return `${window.location.origin}/login?${params.toString()}`;
  };

  const copyText = async (value: string) => {
    if (!navigator?.clipboard?.writeText) return;
    await navigator.clipboard.writeText(value);
  };

  const createInvite = async (fullNameInput: string, emailInput: string, roleInput: RoleValue) => {
    const email = emailInput.trim().toLowerCase();
    const fullName = fullNameInput.trim();

    if (!email || !fullName) {
      setError('Name and email are required to create an invite.');
      return;
    }

    setError(null);
    setSuccess(null);
    setCreatingInvite(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const invitedBy = sessionData.session?.user?.id || null;

    const { data, error: inviteError } = await supabase
      .from('caregiver_invites')
      .upsert(
        {
          email,
          full_name: fullName,
          role: roleInput,
          status: 'pending',
          invited_by: invitedBy,
        },
        { onConflict: 'email' }
      )
      .select('invite_token, email')
      .single();

    if (inviteError) {
      setError(mapDataError(inviteError.message));
      setCreatingInvite(false);
      return;
    }

    const link = buildInviteLink(data.invite_token, data.email);
    setInviteLink(link);
    await copyText(link);
    invalidateCachedQuery(invitesQueryKey);
    await refetchInvites();
    setSuccess('Invite link copied. Share it with the caregiver.');
    setCreatingInvite(false);
  };

  const assignRole = async (user: AccessProfile) => {
    const nextRole = getSelectedRole(user);
    const currentRole = currentRoles[user.id] || 'employee';
    const nextName = getSelectedName(user).trim();
    const nextEmail = getSelectedEmail(user).trim().toLowerCase();
    const currentName = (user.full_name || '').trim();
    const currentEmail = (user.email || '').trim().toLowerCase();

    if (nextRole === currentRole && nextName === currentName && nextEmail === currentEmail) return;

    setError(null);
    setSuccess(null);
    setSavingUserId(user.id);

    if (!nextName) {
      setError('Name cannot be empty.');
      setSavingUserId(null);
      return;
    }

    if (!nextEmail) {
      setError('Email cannot be empty.');
      setSavingUserId(null);
      return;
    }

    const payload =
      nextRole === 'admin'
        ? { full_name: nextName, email: nextEmail, role: 'manager', is_admin: true }
        : nextRole === 'manager'
          ? { full_name: nextName, email: nextEmail, role: 'manager', is_admin: false }
          : { full_name: nextName, email: nextEmail, role: 'employee', is_admin: false };

    const { error: updateError } = await supabase.from('profiles').update(payload).eq('id', user.id);

    if (updateError) {
      setError(mapDataError(updateError.message));
      setSavingUserId(null);
      return;
    }

    invalidateCachedQuery(queryKey);
    await refetch();
    setSuccess('User profile updated.');
    setSavingUserId(null);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
      <div className="border-b border-emerald-50 p-6">
        <h2 className="font-bold text-emerald-900">Roles & Access</h2>
        <p className="mt-1 text-sm text-emerald-700">Use Assign Role to set caregiver, manager, or admin access.</p>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert" aria-live="polite">
          {error}
        </div>
      )}
      {success && (
        <div className="mx-6 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700" role="status" aria-live="polite">
          {success}
        </div>
      )}

      <div className="mx-6 mt-6 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
        <h3 className="text-sm font-bold text-emerald-900">Add Caregiver + Invite</h3>
        <p className="mt-1 text-xs text-emerald-700">Creates or refreshes an invite entry, then copies the login invite link.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            type="text"
            value={inviteName}
            onChange={(event) => setInviteName(event.target.value)}
            placeholder="Full name"
            className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="Email"
            className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <select
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value as RoleValue)}
            className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="employee">Caregiver</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="button"
            disabled={creatingInvite}
            onClick={() => {
              void createInvite(inviteName, inviteEmail, inviteRole);
            }}
            className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creatingInvite ? 'Creating...' : 'Generate Invite Link'}
          </button>
        </div>
        {inviteLink && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3 text-xs text-emerald-700">
            <p className="font-semibold text-emerald-900">Last Invite Link</p>
            <p className="mt-1 break-all">{inviteLink}</p>
          </div>
        )}
      </div>

      <div className="overflow-x-auto p-6 pt-4">
        <table className="w-full text-left">
          <thead className="bg-emerald-50/50 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Current Role</th>
              <th className="px-4 py-3">Assign Role</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-emerald-500">
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-emerald-500">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const currentRole = currentRoles[user.id] || 'employee';
                const selectedRole = getSelectedRole(user);
                const isSaving = savingUserId === user.id;

                return (
                  <tr key={user.id} className="transition-colors hover:bg-emerald-50/30">
                    <td className="px-4 py-4">
                      <input
                        type="text"
                        value={getSelectedName(user)}
                        onChange={(event) =>
                          setPendingNames((previous) => ({
                            ...previous,
                            [user.id]: event.target.value,
                          }))
                        }
                        className="w-full min-w-[180px] rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        type="email"
                        value={getSelectedEmail(user)}
                        onChange={(event) =>
                          setPendingEmails((previous) => ({
                            ...previous,
                            [user.id]: event.target.value,
                          }))
                        }
                        className="w-full min-w-[220px] rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-4 text-sm capitalize text-emerald-700">{currentRole}</td>
                    <td className="px-4 py-4">
                      <select
                        value={selectedRole}
                        onChange={(e) =>
                          setPendingRoles((previous) => ({
                            ...previous,
                            [user.id]: e.target.value as RoleValue,
                          }))
                        }
                        className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="employee">Caregiver</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => {
                            void assignRole(user);
                          }}
                          disabled={isSaving}
                          className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            void createInvite(getSelectedName(user), getSelectedEmail(user), selectedRole);
                          }}
                          disabled={creatingInvite}
                          className="rounded-lg border border-sky-300 bg-white px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {creatingInvite ? 'Building...' : 'Invite Link'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-emerald-50 p-6">
        <h3 className="text-sm font-bold text-emerald-900">Recent Invites</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-emerald-50/50 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50">
              {loadingInvites ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-sm text-emerald-500">
                    Loading invites...
                  </td>
                </tr>
              ) : invites.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-sm text-emerald-500">
                    No invites yet.
                  </td>
                </tr>
              ) : (
                invites.map((invite) => (
                  <tr key={invite.id}>
                    <td className="px-3 py-3 text-sm text-emerald-900">{invite.full_name}</td>
                    <td className="px-3 py-3 text-sm text-emerald-700">{invite.email}</td>
                    <td className="px-3 py-3 text-sm capitalize text-emerald-700">{invite.role}</td>
                    <td className="px-3 py-3 text-sm capitalize text-emerald-700">{invite.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RolesAccessPanel;
