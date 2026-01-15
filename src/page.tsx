
import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Session } from '@supabase/supabase-js';
import { AdminDashboard, EmployeeDashboard, LoginPage, NoRole } from './components';

interface Profile {
  id: string;
  full_name: string;
  role: string;
}

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        await fetchUserProfile(session.user);
      }
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (user: any) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      } else if (error && error.code === 'PGRST116') { // 'PGRST116' indicates no rows found
        // Profile doesn't exist, check if this is the first user.
        const { data: allProfiles, error: countError } = await supabase
          .from('profiles')
          .select('id');

        if (countError) {
          throw countError;
        } 
        if (allProfiles && allProfiles.length === 0) {
          // First user, create a profile with admin role
          const { data: newUser, error: insertError } = await supabase
            .from('profiles')
            .insert([{ id: user.id, full_name: user.email, role: 'admin' }])
            .single();
          if (insertError) throw insertError;
          setProfile(newUser);
        } else {
            // Not the first user, so they need to be approved
            setProfile({ id: user.id, full_name: user.email, role: '' });
        }
      } else if (error) {
        throw error;
      }
    } catch (error: any) {
      setMessage("An unexpected error occurred while fetching your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><div className="text-xl">Loading...</div></div>;
  }

  if (!session) {
    return <LoginPage />;
  }

  if (message) {
    return <div className="flex items-center justify-center h-screen"><div className="text-xl text-red-500">{message}</div></div>;
  }

  if (profile) {
    switch (profile.role) {
      case 'admin':
        return <AdminDashboard admin={profile} />;
      case 'user':
        return <EmployeeDashboard employee={profile} />;
      default:
        return <NoRole />;
    }
  }

  return <div className="flex items-center justify-center h-screen"><div className="text-xl">Loading...</div></div>;
};

export default App;
