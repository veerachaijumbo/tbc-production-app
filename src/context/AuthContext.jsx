import React, { createContext, useState, useEffect } from 'react';
import { supabase, onAuthStateChange } from '../lib/supabaseClient';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper function ดึง role (มี timeout + error handling)
  const fetchUserRole = async (userId) => {
    try {
      const { data, error } = await Promise.race([
        supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .single(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 3000)
        )
      ]);

      if (error) {
        console.warn('Error fetching role:', error.message);
        return 'operator'; // default
      }
      return data?.role || 'operator';
    } catch (err) {
      console.warn('fetchUserRole failed:', err.message);
      return 'operator'; // fallback
    }
  };

  useEffect(() => {
    let mounted = true;

    // Safety timeout — บังคับให้ loading จบใน 5 วินาที ไม่ว่ายังไง
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth check timeout - forcing loading to false');
        setLoading(false);
      }
    }, 5000);

    // Check current session
    const checkUser = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!mounted) return;

        if (currentUser) {
          setUser(currentUser);
          const role = await fetchUserRole(currentUser.id);
          if (mounted) setUserRole(role);
        }
      } catch (err) {
        console.error('checkUser failed:', err);
      } finally {
        if (mounted) {
          clearTimeout(safetyTimeout);
          setLoading(false);
        }
      }
    };

    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        const role = await fetchUserRole(session.user.id);
        if (mounted) setUserRole(role);
      } else {
        setUser(null);
        setUserRole(null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription?.unsubscribe();
    };
  }, []);

  const value = {
    user,
    userRole,
    loading,
    isAuthenticated: !!user,
    isOperator: userRole === 'operator',
    isQC: userRole === 'qc',
    isManager: userRole === 'manager',
    isAdmin: userRole === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}