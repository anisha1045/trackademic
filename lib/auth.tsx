'use client'

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { createBrowserClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'

// Define the shape of our auth context
interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (
    email: string,
    password: string,
    metadata?: Record<string, any>
  ) => Promise<{ data: any; error: any }>
  signIn: (
    email: string,
    password: string
  ) => Promise<{ data: any; error: any }>
  signOut: () => Promise<{ error: any }>
}


// Create the context with a proper type
const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true;
  
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (isMounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    };
  
    getSession();
  
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });
  
    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signUp: AuthContextType['signUp'] = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    })
    return { data, error }
  }

  const signIn: AuthContextType['signIn'] = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  }

  const signOut: AuthContextType['signOut'] = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const value: AuthContextType = useMemo(() => ({
    user,
    loading,
    signUp,
    signIn,
    signOut
  }), [user, loading]); // Add other dependencies if needed

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}