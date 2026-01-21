import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { Session } from '@supabase/supabase-js';
import { Route, Routes, Navigate } from 'react-router-dom';
import { Dashboard } from './components';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  is_admin?: boolean;
}

const RootLayout: React.FC<{
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}> = ({ session, profile, isAdmin, loading, error }) => {
  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Loading...</h2>
        <p>Setting up your profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.href = '/login'}>Go to Login</button>
      </div>
    );
  }

  if (!profile || !session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Dashboard
      profile={profile}
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
  const currentUserIdRef = useRef<string | null>(null);
  const listenerRef = useRef<ReturnType<typeof supabase.auth.onAuthStateChange> | null>(null);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role, is_admin')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        setError('Failed to load profile.');
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      if (!profileData) {
        setError('No profile found.');
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setProfile(profileData);
      setIsAdmin(profileData.is_admin === true);
      setError(null);
      setLoading(false);
      console.log('Profile loaded:', { id: profileData.id, isAdmin: profileData.is_admin });
    } catch (err) {
      console.error('Profile fetch error:', err);
      setError('An unexpected error occurred.');
      setProfile(null);
      setIsAdmin(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const setupAuth = async () => {
      try {
        // Get initial session
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (sessionError) {
          setError('Failed to get session.');
          setSession(null);
          setLoading(false);
          return;
        }

        if (data.session?.user) {
          currentUserIdRef.current = data.session.user.id;
          setSession(data.session);
          await fetchUserProfile(data.session.user.id);
        } else {
          setSession(null);
          setProfile(null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth setup error:', err);
        setError('An error occurred.');
        setLoading(false);
      }

      if (!isMounted) return;

      // Setup listener ONLY for login/logout events, not initial
      listenerRef.current = supabase.auth.onAuthStateChange((event, newSession) => {
        if (!isMounted) return;

        // Only process real auth changes, not initial session load
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          if (event === 'SIGNED_OUT') {
            // Clear everything on sign out
            currentUserIdRef.current = null;
            setSession(null);
            setProfile(null);
            setIsAdmin(false);
            setError(null);
            setLoading(false);
            console.log('Signed out');
          }
          // For SIGNED_IN and INITIAL_SESSION, getSession call above already handled it
        }
      });
    };

    setupAuth();

    return () => {
      isMounted = false;
      if (listenerRef.current?.data?.subscription) {
        listenerRef.current.data.subscription.unsubscribe();
      }
    };
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<RootLayout session={session} profile={profile} isAdmin={isAdmin} loading={loading} error={error} />} />
    </Routes>
  );
};

export default App;
