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
  authReady: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      // Supabase 설정이 없을 때도 앱이 동작하도록 로그인 기능만 비활성화
      setUser(null)
      setLoading(false)
      return
    }
    const client = supabase
    const init = async () => {
      const {
        data: { session },
      } = await client.auth.getSession()
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
    const { data: subscription } = client.auth.onAuthStateChange((_event, currentSession) => {
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
    const client = supabase
    if (!client) {
      throw new Error('로그인 기능이 비활성화되었습니다. 관리자에게 문의해 주세요.')
    }
    const { error } = await client.auth.signInWithOAuth({
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
    const client = supabase
    if (!client) return
    const { error } = await client.auth.signOut()
    if (error) throw error
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      authReady: Boolean(supabase),
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

