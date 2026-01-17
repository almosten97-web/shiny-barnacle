import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Session } from '@supabase/supabase-js';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Dashboard } from './components';

interface Profile {
  id: string;
  full_name: string;
  role: string;
}

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
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
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (user: any) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        setError('Failed to load profile. Please check your database setup.');
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(profileData);
      setError(null);
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      setError('An unexpected error occurred while loading your profile.');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const setLoadingState = (msg: string) => {
    setMessage(msg);
    setLoading(true);
  };

  if (loading) return <div>Loading...</div>;

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.href = '/login'}>Go to Login</button>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Navigate to="/" />} />
        <Route path="*" element={<Dashboard profile={profile as Profile} session={session as Session} />} />
      </Routes>
    </Router>
  );
};

export default App;
