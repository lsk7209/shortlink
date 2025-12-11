import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { useAuth } from '../lib/auth'
import { usePageMeta } from '../lib/seo'

type LinkItem = {
  id: string
  slug: string
  target_url: string
  created_at: string
  click_count: number
  active: boolean
  click_limit?: number | null
  expires_at?: string | null
}

const Links = () => {
  const { user } = useAuth()
  const [items, setItems] = useState<LinkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [search, setSearch] = useState('')

  usePageMeta({
    title: '내 링크 관리 | shorty.link',
    description: '로그인 후 생성한 단축 링크를 한 곳에서 관리하세요.',
    canonical: `${(import.meta.env.VITE_SITE_URL as string | undefined) ?? window.location.origin}/links`,
  })

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const params = new URLSearchParams()
        if (status !== 'all') params.set('status', status)
        if (search.trim()) params.set('search', search.trim())
        const res = await apiFetch<{ links: LinkItem[] }>(`/api/links?${params.toString()}`, {
          token: user?.accessToken,
        })
        setItems(res.links ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : '조회 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }
    void fetchLinks()
  }, [user, status, search])

  const shortDomain = (import.meta.env.VITE_SITE_URL as string | undefined) ?? window.location.origin

  const toggleActive = async (id: string, next: boolean) => {
    if (!user?.accessToken) return
    setPendingId(id)
    try {
      const res = await apiFetch<{ link: LinkItem }>('/api/links', {
        method: 'PATCH',
        body: { id, active: next },
        token: user.accessToken,
      })
      setItems((prev) => prev.map((l) => (l.id === id ? { ...l, active: res.link.active } : l)))
    } catch (err) {
      setError(err instanceof Error ? err.message : '상태 변경 중 오류가 발생했습니다.')
    } finally {
      setPendingId(null)
    }
  }

  const deleteLink = async (id: string) => {
    if (!user?.accessToken) return
    setPendingId(id)
    try {
      await apiFetch<{ ok: boolean }>(`/api/links?id=${id}`, {
        method: 'DELETE',
        token: user.accessToken,
      })
      setItems((prev) => prev.filter((l) => l.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">내 링크</h1>
          <p className="text-sm text-slate-600">로그인 후 생성한 링크를 여기서 관리합니다.</p>
        </div>
        <button
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          새 링크 만들기
        </button>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
            {(['all', 'active', 'inactive'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setStatus(key)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  status === key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                {key === 'all' ? '전체' : key === 'active' ? '활성' : '비활성'}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="슬러그 또는 URL 검색"
            className="min-w-[200px] rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        {loading && <p className="text-sm text-slate-600">불러오는 중...</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-slate-600">
            아직 생성된 링크가 없습니다. 상단의 버튼을 눌러 첫 단축 링크를 만들어 보세요.
          </p>
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {items.length > 0 && (
          <div className="mt-2 overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">슬러그</th>
                  <th className="px-3 py-2">원본 URL</th>
                  <th className="px-3 py-2">클릭</th>
                  <th className="px-3 py-2">한도</th>
                  <th className="px-3 py-2">상태</th>
                  <th className="px-3 py-2">생성일</th>
                  <th className="px-3 py-2 text-right">액션</th>
                </tr>
              </thead>
              <tbody>
                {items.map((link) => (
                  <tr key={link.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold text-brand-700">
                      <a href={`${shortDomain}/r/${link.slug}`} target="_blank" rel="noreferrer">
                        {link.slug}
                      </a>
                    </td>
                    <td className="px-3 py-2 max-w-xs truncate text-slate-700">{link.target_url}</td>
                    <td className="px-3 py-2">{link.click_count}</td>
                    <td className="px-3 py-2">{link.click_limit ?? '-'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          link.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {link.active ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      <div>{new Date(link.created_at).toLocaleString()}</div>
                      {link.expires_at && (
                        <div className="text-xs text-slate-400">만료: {new Date(link.expires_at).toLocaleString()}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => toggleActive(link.id, !link.active)}
                          disabled={pendingId === link.id || !user?.accessToken}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-brand-200 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {pendingId === link.id ? '...' : link.active ? '비활성화' : '활성화'}
                        </button>
                        <button
                          onClick={() => deleteLink(link.id)}
                          disabled={pendingId === link.id || !user?.accessToken}
                          className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Links

