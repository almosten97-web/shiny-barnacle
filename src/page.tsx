import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabase';
import { Session } from '@supabase/supabase-js';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Dashboard, Login } from './components/index';
import SharedCalendarView from './components/SharedCalendarView';
import NotFound from './components/NotFound';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  is_admin?: boolean;
}

const CompleteProfileView: React.FC<{
  initialName: string;
  email: string;
  onSave: (fullName: string) => Promise<void>;
  saving: boolean;
  error: string | null;
}> = ({ initialName, email, onSave, saving, error }) => {
  const [fullName, setFullName] = useState(initialName);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSave(fullName);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-emerald-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-emerald-900">Welcome to Charlene&apos;s Scheduling App</h1>
        <p className="mt-2 text-sm text-emerald-700">Add your full name to finish setting up your account.</p>
        <p className="mt-1 text-xs text-emerald-500">{email}</p>
        <label htmlFor="full-name" className="mt-5 block text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Full Name
        </label>
        <input
          id="full-name"
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Your full name"
          autoFocus
        />
        {error && (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={saving || !fullName.trim()}
          className="mt-5 w-full rounded-lg border border-emerald-300 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Name'}
        </button>
      </form>
    </div>
  );
};

const ProtectedRoute: React.FC<{
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  needsNameSetup: boolean;
  savingName: boolean;
  nameSetupError: string | null;
  onSaveName: (fullName: string) => Promise<void>;
}> = ({ session, profile, isAdmin, loading, error, needsNameSetup, savingName, nameSetupError, onSaveName }) => {
  // If still loading, show loading screen
  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Loading...</h2>
        <p>Checking authentication...</p>
      </div>
    );
  }

  // If error, show error screen
  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.href = '/login'}>Go to Login</button>
      </div>
    );
  }

  // If no session, redirect to login via route
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Fall back to a default caregiver profile so new users without a profile row can still access the app.
  const effectiveProfile: Profile =
    profile ||
    ({
      id: session.user.id,
      full_name: session.user.user_metadata?.full_name || '',
      role: 'employee',
      is_admin: false,
    } as Profile);

  if (needsNameSetup) {
    return (
      <CompleteProfileView
        initialName={effectiveProfile.full_name}
        email={session.user.email || 'No email found'}
        onSave={onSaveName}
        saving={savingName}
        error={nameSetupError}
      />
    );
  }

  // User is authenticated, show dashboard
  return (
    <Dashboard
      profile={effectiveProfile}
      session={session}
      isAdmin={isAdmin}
    />
  );
};

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsNameSetup, setNeedsNameSetup] = useState(false);
  const [nameSetupError, setNameSetupError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [hasPersistedProfile, setHasPersistedProfile] = useState(false);
  const isMountedRef = useRef(true);
  const isDev = import.meta.env.DEV;

  const applyPendingInvite = useCallback(async (user: Session['user'], baseProfile: Profile): Promise<Profile> => {
    try {
      if (!user.email || baseProfile.is_admin || baseProfile.role === 'manager') return baseProfile;

      const normalizedEmail = user.email.trim().toLowerCase();

      const { data: invite, error: inviteError } = await supabase
        .from('caregiver_invites')
        .select('id, full_name, role')
        .eq('email', normalizedEmail)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (inviteError || !invite) return baseProfile;

      const invitedRole = (invite.role || 'employee').toLowerCase();
      const appliedProfile: Profile =
        invitedRole === 'admin'
          ? { ...baseProfile, full_name: invite.full_name || baseProfile.full_name, role: 'manager', is_admin: true }
          : invitedRole === 'manager'
            ? { ...baseProfile, full_name: invite.full_name || baseProfile.full_name, role: 'manager', is_admin: false }
            : { ...baseProfile, full_name: invite.full_name || baseProfile.full_name, role: 'employee', is_admin: false };

      const { error: profileUpdateError } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          email: normalizedEmail,
          full_name: appliedProfile.full_name,
          role: appliedProfile.role,
          is_admin: Boolean(appliedProfile.is_admin),
        },
        { onConflict: 'id' }
      );

      if (profileUpdateError) return baseProfile;

      await supabase
        .from('caregiver_invites')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invite.id);

      return appliedProfile;
    } catch {
      return baseProfile;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    setError(null);
    setNeedsNameSetup(false);
    setNameSetupError(null);
    setHasPersistedProfile(false);
    setLoading(false);
  }, []);

  const fetchUserProfile = useCallback(async (user: Session['user']) => {
    console.log('Fetching profile for user:', user.id);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role, is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (!isMountedRef.current) return;

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        setError('Failed to load profile.');
        setProfile(null);
        setIsAdmin(false);
        setNeedsNameSetup(false);
        setHasPersistedProfile(false);
        setLoading(false);
        return;
      }

      if (!profileData) {
        const metadataName =
          typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : '';

        const fallbackProfile: Profile = {
          id: user.id,
          full_name: metadataName,
          role: 'employee',
          is_admin: false,
        };

        const invitedProfile = await applyPendingInvite(user, fallbackProfile);

        setProfile(invitedProfile);
        setIsAdmin(false);
        setNeedsNameSetup(!invitedProfile.full_name?.trim());
        setHasPersistedProfile(false);
        setError(null);
        setLoading(false);
        return;
      }

      const invitedProfile = await applyPendingInvite(user, profileData as Profile);

      console.log('Profile fetched:', invitedProfile);
      setProfile(invitedProfile);
      setIsAdmin(invitedProfile.is_admin === true);
      setNeedsNameSetup(!(invitedProfile.full_name || '').trim());
      setHasPersistedProfile(true);
      setNameSetupError(null);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Profile fetch exception:', err);
      if (isMountedRef.current) {
        setError('An unexpected error occurred.');
        setProfile(null);
        setIsAdmin(false);
        setNeedsNameSetup(false);
        setHasPersistedProfile(false);
        setLoading(false);
      }
    }
  }, [applyPendingInvite]);

  const handleSaveName = useCallback(
    async (fullNameInput: string) => {
      if (!session?.user) return;

      const fullName = fullNameInput.trim();
      if (!fullName) {
        setNameSetupError('Please enter your full name.');
        return;
      }

      setSavingName(true);
      setNameSetupError(null);

      const email = session.user.email?.trim() || `${session.user.id}@placeholder.local`;

      const payload = {
        id: session.user.id,
        email,
        full_name: fullName,
        role: profile?.role || 'employee',
        is_admin: Boolean(profile?.is_admin),
      };

      const query = hasPersistedProfile
        ? supabase.from('profiles').update({ full_name: fullName, email }).eq('id', session.user.id)
        : supabase.from('profiles').upsert(payload, { onConflict: 'id' });

      const { error: saveError } = await query;

      if (saveError) {
        setNameSetupError(saveError.message);
        setSavingName(false);
        return;
      }

      await fetchUserProfile(session.user);
      setNeedsNameSetup(false);
      setSavingName(false);
    },
    [fetchUserProfile, hasPersistedProfile, profile?.is_admin, profile?.role, session]
  );

  useEffect(() => {
    isMountedRef.current = true;

    const initializeAuth = async () => {
      try {
        console.log('Getting session...');
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (!isMountedRef.current) return;

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Failed to get session.');
          setSession(null);
          setLoading(false);
          return;
        }

        const currentSession = data.session;
        console.log('Session:', currentSession ? 'Found' : 'None');

        if (currentSession?.user) {
          setSession(currentSession);
          await fetchUserProfile(currentSession.user);
        } else {
          setSession(null);
          setProfile(null);
          setNeedsNameSetup(false);
          setNameSetupError(null);
          setHasPersistedProfile(false);
          setLoading(false);
          console.log('No session found - user needs to login');
        }
      } catch (err) {
        console.error('Auth init error:', err);
        if (isMountedRef.current) {
          setError('An error occurred.');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMountedRef.current) return;

      console.log('Auth event:', event);

      // Skip INITIAL_SESSION - already handled by getSession
      if (event === 'INITIAL_SESSION') {
        console.log('Skipping INITIAL_SESSION');
        return;
      }

      if (event === 'SIGNED_IN' && newSession?.user) {
        console.log('User signed in');
        setSession(newSession);
        setError(null);
        setLoading(true);
        fetchUserProfile(newSession.user);
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setSession(null);
        setProfile(null);
        setIsAdmin(false);
        setError(null);
        setNeedsNameSetup(false);
        setNameSetupError(null);
        setHasPersistedProfile(false);
        setLoading(false);
      }
    });

    return () => {
      isMountedRef.current = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [fetchUserProfile]);

  return (
    <>
      {session && (
        <button
          type="button"
          onClick={handleLogout}
          className="fixed right-3 top-3 z-[9999] rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50"
        >
          Log Out
        </button>
      )}
      {isDev && (
        <div className="fixed bottom-2 right-2 z-[9999] rounded border border-slate-300 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow">
          <div>loading: {String(loading)}</div>
          <div>session: {session ? 'yes' : 'no'}</div>
          <div>profile: {profile ? 'yes' : 'no'}</div>
          <div>isAdmin: {String(isAdmin)}</div>
          <div>needsNameSetup: {String(needsNameSetup)}</div>
          <div>error: {error || 'none'}</div>
        </div>
      )}
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/shared/:type/:token" element={<SharedCalendarView />} />
        
        {/* Protected dashboard route */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute 
              session={session} 
              profile={profile} 
              isAdmin={isAdmin} 
              loading={loading} 
              error={error}
              needsNameSetup={needsNameSetup}
              savingName={savingName}
              nameSetupError={nameSetupError}
              onSaveName={handleSaveName}
            />
          } 
        />

        {/* Explicit 404 route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

export default App;
