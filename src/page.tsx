import React, { useState, useEffect } from 'react';
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

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Failed to get session. Please try logging in again.');
          setLoading(false);
          return;
        }
        setSession(data.session);
        if (data.session?.user) {
          await fetchUserProfile(data.session.user);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Unexpected error getting session:', err);
        setError('An unexpected error occurred. Please try again.');
        setLoading(false);
      }
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (user: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role, is_admin')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        setError('Failed to load profile. Please check your database setup.');
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      if (!profileData) {
        setError('No profile found for this user.');
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Check admin status from profile - explicitly from is_admin column
      const adminStatus = profileData.is_admin === true;
      setProfile(profileData);
      setIsAdmin(adminStatus);
      setError(null);
      
      console.log('User profile loaded:', { id: profileData.id, isAdmin: adminStatus });
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      setError('An unexpected error occurred while loading your profile.');
      setProfile(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>Loading...</h2>
          <p>Setting up your profile...</p>
        </div>
      )}

      {error && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.href = '/login'}>Go to Login</button>
        </div>
      )}

      {!loading && !error && (
        <Routes>
          <Route path="/login" element={<Navigate to="/" />} />
          <Route 
            path="*" 
            element={
              profile && session ? (
                <Dashboard 
                  profile={profile} 
                  session={session} 
                  isAdmin={isAdmin}
                />
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
        </Routes>
      )}
    </>
  );
};

export default App;
