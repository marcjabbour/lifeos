/**
 * Client-side Authentication Hooks
 *
 * React hooks for managing authentication state in the browser.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/core/database'

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
}

/**
 * Hook for managing authentication state
 */
export function useAuth(): AuthState & {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signInWithOAuth: (provider: 'google' | 'github' | 'apple') => Promise<void>
} {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) throw error

        setState({
          user: session?.user ?? null,
          session,
          loading: false,
          error: null,
        })
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to get session',
        }))
      }
    }

    getSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
        error: null,
      })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Sign in failed',
      }))
      throw err
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Sign up failed',
      }))
      throw err
    }
  }, [])

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const { error } = await supabase.auth.signOut()

      if (error) throw error
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Sign out failed',
      }))
      throw err
    }
  }, [])

  const signInWithOAuth = useCallback(async (provider: 'google' | 'github' | 'apple') => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'OAuth sign in failed',
      }))
      throw err
    }
  }, [])

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    signInWithOAuth,
  }
}

/**
 * Hook for checking if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { user, loading } = useAuth()
  return !loading && !!user
}

/**
 * Hook for getting the current user ID
 */
export function useUserId(): string | null {
  const { user } = useAuth()
  return user?.id ?? null
}
