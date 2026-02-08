import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { Session } from '@supabase/supabase-js';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Login } from './components';
import AppShell from './components/layout/AppShell';
import Overview from './pages/Overview';
import Schedule from './pages/Schedule';
import Staff from './pages/Staff';
import Clients from './pages/Clients';
import Visits from './pages/Visits';
import Requests from './pages/Requests';
import Availability from './pages/Availability';
import Roles from './pages/Roles';
import Settings from './pages/Settings';
import ShiftDetails from './components/ShiftDetails';

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  is_admin?: boolean;
}

const ProtectedRoute: React.FC<{
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}> = ({ session, profile, isAdmin, loading, error }) => {
  const navigate = useNavigate();

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
        <button type="button" onClick={() => navigate('/login', { replace: true })}>
          Go to Login
        </button>
      </div>
    );
  }

  // If no session or profile, redirect to login via route
  if (!session || !profile) {
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, show dashboard
  return <AppShell profile={{ ...profile, is_admin: isAdmin }} />;
};

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchUserProfile = async (userId: string) => {
    console.log('Fetching profile for user:', userId);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, is_admin')
        .eq('id', userId)
        .single();

      if (!isMountedRef.current) return;

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        setError('Failed to load profile.');
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      if (!profileData) {
        console.log('No profile data returned');
        setError('No profile found.');
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      console.log('Profile fetched:', profileData);
      setProfile(profileData);
      setIsAdmin(profileData.is_admin === true);
      setError(null);
      setLoginMessage(null);
      setLoading(false);
    } catch (err) {
      console.error('Profile fetch exception:', err);
      if (isMountedRef.current) {
        setError('An unexpected error occurred.');
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    }
  };

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
          await fetchUserProfile(currentSession.user.id);
        } else {
        setSession(null);
        setProfile(null);
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
        setLoading(true);
        fetchUserProfile(newSession.user.id);
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setSession(null);
        setProfile(null);
        setIsAdmin(false);
        setError(null);
        setLoginMessage(null);
        setLoading(false);
      }
    });

    return () => {
      isMountedRef.current = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Login
            message={loginMessage}
            onError={(message) => setLoginMessage(message || null)}
            onLoginSuccess={() => {}}
          />
        }
      />
      <Route
        path="/"
        element={<ProtectedRoute session={session} profile={profile} isAdmin={isAdmin} loading={loading} error={error} />}
      >
        <Route index element={<Overview />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="staff" element={<Staff />} />
        <Route path="clients" element={<Clients />} />
        <Route path="visits" element={<Visits />} />
        <Route path="requests" element={<Requests />} />
        <Route path="availability" element={<Availability />} />
        <Route path="roles" element={<Roles />} />
        <Route path="settings" element={<Settings />} />
        <Route path="shifts/:shiftId" element={<ShiftDetails />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
