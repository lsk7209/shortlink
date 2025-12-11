import { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

type LayoutProps = {
  children: ReactNode
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-sm font-medium rounded-full transition ${
    isActive ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
  }`

const Header = () => {
  const { user, loading, signIn, signOut } = useAuth()

  const handleAuthClick = async () => {
    if (loading) return
    if (user) {
      await signOut()
      return
    }
    await signIn()
  }

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-100">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="h-8 w-8 rounded-xl bg-brand-600 text-white grid place-items-center text-sm">S</span>
          shorty.link
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          <NavLink to="/links" className={navLinkClass}>
            내 링크
          </NavLink>
          <NavLink to="/admin" className={navLinkClass}>
            관리자
          </NavLink>
          <NavLink to="/about" className={navLinkClass}>
            소개
          </NavLink>
          <NavLink to="/contact" className={navLinkClass}>
            문의
          </NavLink>
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAuthClick}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-brand-200 hover:text-brand-700"
          >
            {loading ? '...' : user ? '로그아웃' : '로그인'}
          </button>
        </div>
      </div>
    </header>
  )
}

const Footer = () => (
  <footer className="border-t border-slate-100 bg-white/70 backdrop-blur">
    <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <div>© {new Date().getFullYear()} shorty.link</div>
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/privacy" className="hover:text-slate-800">
          개인정보 처리방침
        </Link>
        <Link to="/terms" className="hover:text-slate-800">
          이용 약관
        </Link>
      </div>
    </div>
  </footer>
)

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <Header />
      <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-6xl flex-col gap-10 px-4 py-10">
        {children}
      </main>
      <Footer />
    </div>
  )
}

export default Layout

