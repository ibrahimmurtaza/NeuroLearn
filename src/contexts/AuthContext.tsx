'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/types/profile'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  profileExists: boolean
  loading: boolean
  profileLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName: string, role?: 'student' | 'tutor') => Promise<{ error: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any }>
  checkProfile: (sessionUser?: User | null) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileExists, setProfileExists] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  
  // Add a ref to track if a profile check is already in progress
  const profileCheckInProgressRef = useRef(false)

  // Function to check if user has a profile
  const checkProfile = async (sessionUser?: User | null) => {
    // Use the passed user or fall back to the state user
    const currentUser = sessionUser || user
    
    // Check if we have a user, but don't require access_token since API has cookie fallback
    if (!currentUser) {
      setProfile(null)
      setProfileExists(false)
      setProfileLoading(false) // Ensure profileLoading is false when no user
      return
    }

    // Prevent multiple simultaneous profile checks
    if (profileCheckInProgressRef.current) {
      return
    }

    profileCheckInProgressRef.current = true
    setProfileLoading(true)
    try {
      // Prepare headers - include Bearer token if available, otherwise rely on cookie fallback
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/profile', {
        headers,
        credentials: 'include', // Ensure cookies are sent for fallback auth
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.data.profile)
        setProfileExists(data.data.exists)
      } else {
        console.error('Failed to fetch profile:', response.status, response.statusText)
        setProfile(null)
        setProfileExists(false)
      }
    } catch (error) {
      console.error('Error checking profile:', error)
      setProfile(null)
      setProfileExists(false)
    } finally {
      setProfileLoading(false)
      profileCheckInProgressRef.current = false // Reset the flag
    }
  }

  // Function to refresh profile data
  const refreshProfile = async () => {
    await checkProfile()
  }

  useEffect(() => {
    const supabaseClient = supabase();
    // Get initial session
    supabaseClient.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Check profile if user is logged in
      if (session?.user) {
        checkProfile(session.user)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (event: string, session: Session | null) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Check profile when user logs in or when we have an initial session
      if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        checkProfile(session.user)
      } else if (!session?.user && event === 'SIGNED_OUT') {
        // Only clear profile data when user explicitly logs out
        setProfile(null)
        setProfileExists(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase().auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, fullName: string, role: 'student' | 'tutor' = 'student') => {
    const { error } = await supabase().auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    })
    
    return { error }
  }

  const signOut = async () => {
    await supabase().auth.signOut()
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase().auth.resetPasswordForEmail(email)
    return { error }
  }

  const value = {
    user,
    session,
    profile,
    profileExists,
    loading,
    profileLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    checkProfile,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}