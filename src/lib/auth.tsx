import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { supabase } from './supabaseClient'

type SessionUser = {
  id: string
  email?: string
  role?: string
  accessToken?: string
}

type AuthContextValue = {
  user: SessionUser | null
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? undefined,
          role: session.user.app_metadata?.role,
          accessToken: session.access_token,
        })
      }
      setLoading(false)
    }
    void init()
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (currentSession?.user) {
        setUser({
          id: currentSession.user.id,
          email: currentSession.user.email ?? undefined,
          role: currentSession.user.app_metadata?.role,
          accessToken: currentSession.access_token,
        })
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return () => {
      subscription?.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/links`,
      },
    })
    if (error) {
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signOut,
    }),
    [user, loading, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

