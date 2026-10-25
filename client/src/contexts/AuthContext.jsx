import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('agentops_token') || null);
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('agentops_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(true);

  // Clerk hook bindings (safely handled if ClerkProvider is mounted)
  let clerkAuth = null;
  let clerkUser = null;
  try {
    clerkAuth = useClerkAuth();
    clerkUser = useClerkUser();
  } catch (_) {}

  // Sync Clerk authentication state into AgentOps session
  useEffect(() => {
    async function syncClerk() {
      if (clerkAuth && clerkAuth.isSignedIn && clerkUser && clerkUser.user) {
        try {
          const clerkToken = await clerkAuth.getToken();
          if (clerkToken) {
            setToken(clerkToken);
            localStorage.setItem('agentops_token', clerkToken);

            const u = clerkUser.user;
            const primaryEmail = u.primaryEmailAddress?.emailAddress || u.emailAddresses?.[0]?.emailAddress || 'clerk_user@example.com';
            const initialUserData = {
              id: u.id,
              tenantId: u.id,
              email: primaryEmail,
              name: u.fullName || u.firstName || 'User',
              role: 'user'
            };
            setUser(initialUserData);
            localStorage.setItem('agentops_user', JSON.stringify(initialUserData));

            // Sync with backend /auth/me to fetch canonical MongoDB user profile & unified tenant ID
            try {
              const res = await api.getMe();
              if (res?.data) {
                const unifiedUser = {
                  ...initialUserData,
                  ...res.data,
                  tenantId: res.data.tenantId || res.data.id || u.id
                };
                setUser(unifiedUser);
                localStorage.setItem('agentops_user', JSON.stringify(unifiedUser));
              }
            } catch (syncErr) {
              console.warn('Backend tenant sync notice:', syncErr.message);
            }
          }
        } catch (e) {
          console.error('Clerk token sync error:', e);
        } finally {
          setLoading(false);
        }
      } else if (clerkAuth && clerkAuth.isLoaded && !clerkAuth.isSignedIn) {
        setLoading(false);
      }
    }
    syncClerk();
  }, [clerkAuth?.isSignedIn, clerkAuth?.isLoaded, clerkUser?.user?.id]);

  useEffect(() => {
    async function initAuth() {
      if (token && (!clerkAuth || !clerkAuth.isSignedIn)) {
        try {
          const res = await api.getMe();
          setUser(res.data);
          localStorage.setItem('agentops_user', JSON.stringify(res.data));
        } catch (err) {
          console.error('Session validation failed:', err.message);
          logout();
        }
      }
      if (!clerkAuth) {
        setLoading(false);
      }
    }
    initAuth();
  }, [token]);

  const logout = async () => {
    if (clerkAuth && clerkAuth.signOut) {
      try {
        await clerkAuth.signOut();
      } catch (_) {}
    }
    localStorage.removeItem('agentops_token');
    localStorage.removeItem('agentops_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      token,
      user,
      isAuthenticated: Boolean(token || (clerkAuth && clerkAuth.isSignedIn)),
      loading: loading || (clerkAuth && !clerkAuth.isLoaded),
      logout,
      isClerkConfigured: Boolean(clerkAuth)
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
