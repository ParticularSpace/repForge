import { useEffect, useRef, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()
  const prevUserId = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      prevUserId.current = session?.user?.id ?? null
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const newId = session?.user?.id ?? null
      // Only clear cache when a different user signs in (not on sign-out)
      // On sign-out the AuthGuard redirects to login so stale cache is never shown
      if (newId !== null && prevUserId.current !== undefined && prevUserId.current !== newId) {
        queryClient.clear()
      }
      prevUserId.current = newId
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { user, loading, signOut: () => supabase.auth.signOut() }
}
