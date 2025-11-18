
import React, { useState, useEffect } from 'react';
import { supabase, isPlaceholder } from './services/supabaseClient';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import Dashboard from './Dashboard';
import LoginView from './views/LoginView';
import { User } from './types';

const ConfigurationErrorView: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-200 p-4">
      <div className="w-full max-w-2xl p-8 bg-gray-800 rounded-lg shadow-2xl border border-red-500/50">
        <h1 className="text-3xl font-bold text-red-400 mb-4">Configuration Required</h1>
        <p className="text-gray-300 mb-6">
          The application cannot connect to the backend because the Supabase credentials have not been set. Please configure your environment variables to proceed.
        </p>
        <div className="bg-gray-900/50 p-4 rounded-md text-sm font-mono">
          <p className="text-gray-500 mb-2">// Required Environment Variables</p>
          <p className="text-gray-300 whitespace-pre-wrap">
            <span className="text-purple-400">SUPABASE_URL</span>=<span className="text-yellow-400">"https://your-project-id.supabase.co"</span>
          </p>
          <p className="text-gray-300 whitespace-pre-wrap">
            <span className="text-purple-400">SUPABASE_ANON_KEY</span>=<span className="text-yellow-400">"your-public-anon-key"</span>
          </p>
        </div>
        <p className="text-gray-400 mt-6">
          You can find your project's credentials in your Supabase dashboard under <span className="font-semibold text-emerald-400">Project Settings &gt; API</span>. After setting the environment variables, the application will connect automatically.
        </p>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Intercept and show configuration error before attempting to connect to Supabase
  if (isPlaceholder) {
    return <ConfigurationErrorView />;
  }

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase!.auth.getSession();
      if (session) {
        const { data: profile } = await supabase!
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setLoggedInUser({
              id: session.user.id,
              name: profile.name,
              email: session.user.email!,
              role: profile.role,
          });
        }
      }
      setLoading(false);
    };

    getSession();

    const { data: authListener } = supabase!.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
            const { data: profile } = await supabase!
              .from('profiles')
              .select(`*`)
              .eq('id', session.user.id)
              .single();
            
            if (profile) {
                 setLoggedInUser({
                    id: session.user.id,
                    name: profile.name,
                    email: session.user.email!,
                    role: profile.role,
                });
            }
        } else {
            setLoggedInUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);


  const handleLogin = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase!.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw error;
    }
    // onAuthStateChange will handle setting the user
  };

  const handleLogout = async () => {
    const { error } = await supabase!.auth.signOut();
    if (error) {
        console.error("Error logging out:", error);
    }
    setLoggedInUser(null);
  };

  const handleUpdateProfile = async (
    userId: string, 
    currentPasswordForVerification: string, // No longer directly used, but kept for modal compatibility
    data: { name: string; email: string; newPassword?: string }
  ): Promise<void> => {
      // 1. Update user's authentication details (email/password)
      if (data.newPassword || data.email !== loggedInUser?.email) {
          const { error: authError } = await supabase!.auth.updateUser({
              email: data.email,
              password: data.newPassword
          });
          if (authError) throw authError;
      }
      
      // 2. Update public profile information
      const { error: profileError } = await supabase!
          .from('profiles')
          .update({ name: data.name, email: data.email })
          .eq('id', userId);
          
      if (profileError) throw profileError;
      
      // 3. Refresh local user state
      if (loggedInUser && loggedInUser.id === userId) {
          setLoggedInUser(prev => prev ? { ...prev, name: data.name, email: data.email } : null);
      }
  };

  if (loading) {
    // You might want a proper loading spinner here
    return <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">Loading...</div>;
  }

  if (!loggedInUser) {
    return <LoginView onLogin={handleLogin} />;
  }

  // NOTE: We no longer pass 'users' or 'setUsers'. User management will be handled
  // directly within the UsersView component via Supabase calls.
  return <Dashboard 
            loggedInUser={loggedInUser} 
            onLogout={handleLogout}
            onUpdateProfile={handleUpdateProfile}
         />;
};

export default App;
