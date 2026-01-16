import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Session } from '@supabase/supabase-js';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard, Login } from './components';

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
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
      }

      if (profileData) {
        const { data: userRole, error: roleError } = await supabase
            .from('user_roles')
            .select('roles(name)')
            .eq('user_id', user.id)
            .single();
        
        if (roleError && roleError.code !== 'PGRST116') {
            throw roleError;
        }
        
        const role = userRole ? (userRole as any).roles.name : '';
        setProfile({ ...profileData, role });

      } else { // No profile found, so this is a new user
        
        const { count, error: countError } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true });
        
        if (countError) throw countError;

        // Create the profile first
        const { data: newProfile, error: insertProfileError } = await supabase
            .from('profiles')
            .insert({id: user.id, full_name: user.email})
            .select()
            .single();
        
        if (insertProfileError) throw insertProfileError;
        if (!newProfile) throw new Error("Could not create profile");

        if (count === 0) { // First user, grant admin role
          
          const { data: adminRole, error: adminRoleError } = await supabase
            .from('roles')
            .select('id')
            .eq('name', 'admin')
            .single();
          
          if(adminRoleError) throw adminRoleError;

          if(adminRole) {
            const { error: userRoleError } = await supabase
              .from('user_roles')
              .insert({user_id: user.id, role_id: adminRole.id});

            if(userRoleError) throw userRoleError;

            setProfile({ ...newProfile, role: 'admin' });
          } else {
              // This case should not happen if the seed script has run
              setProfile({ ...newProfile, role: '' });
          }
          
        } else { // Not the first user
          setProfile({ ...newProfile, role: '' });
        }
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

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!session ? <Login onError={setMessage} message={message} onLoginSuccess={() => {}} /> : <Navigate to="/" />} />
        <Route path="/" element={session && profile ? <Dashboard profile={profile as Profile} /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
