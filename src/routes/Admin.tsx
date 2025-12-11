import { usePageMeta } from '../lib/seo'
import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { useAuth } from '../lib/auth'

const Admin = () => {
  const { user, loading: authLoading, authReady, signIn } = useAuth()
  const [stats, setStats] = useState<{
    totalLinks: number
    activeLinks: number
    totalClicks: number
    last7?: number
    last30?: number
    referrers?: { referrer: string; count: number }[]
    devices?: { mobile: number; desktop: number }
    daily?: { date: string; count: number }[]
    rangeDays?: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<
    { id: string; action: string; created_at: string; link_id: string; actor_id: string }[]
  >([])
  const [days, setDays] = useState(30)
  const [health, setHealth] = useState<{
    siteUrl: string
    supabaseUrl: string
    supabaseKey: string
    anonKey: string
    safeBrowsing: boolean
  } | null>(null)

  usePageMeta({
    title: '관리자 콘솔 | shorty.link',
    description: '전체 링크와 로그를 검토하는 관리자 전용 페이지',
    canonical: `${(import.meta.env.VITE_SITE_URL as string | undefined) ?? window.location.origin}/admin`,
  })

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.accessToken) return
      try {
        const res = await apiFetch<{
          totalLinks: number
          activeLinks: number
          totalClicks: number
          last7?: number
          last30?: number
          referrers?: { referrer: string; count: number }[]
          devices?: { mobile: number; desktop: number }
          daily?: { date: string; count: number }[]
          rangeDays?: number
        }>(`/api/stats?days=${days}`, {
          token: user.accessToken,
        })
        setStats(res)
      } catch (err) {
        setError(err instanceof Error ? err.message : '통계 조회 중 오류가 발생했습니다.')
      }
    }
    const fetchLogs = async () => {
      if (!user?.accessToken) return
      try {
        const res = await apiFetch<{
          logs: { id: string; action: string; created_at: string; link_id: string; actor_id: string }[]
        }>('/api/logs', { token: user.accessToken })
        setLogs(res.logs)
      } catch {
        // 로그 실패는 치명적이지 않으므로 무시
      }
    }
    const fetchHealth = async () => {
      try {
        const res = await apiFetch<{
          siteUrl: string
          supabaseUrl: string
          supabaseKey: string
          anonKey: string
          safeBrowsing: boolean
        }>('/api/health')
        setHealth(res)
      } catch {
        // ignore
      }
    }
    void fetchStats()
    void fetchLogs()
    void fetchHealth()
  }, [user, days])

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">관리자 콘솔</h1>
        <p className="text-sm text-slate-600">전체 링크, 사용자별 필터, 활동 로그를 검토합니다.</p>
      </div>
      {!authReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Supabase 환경 변수가 없어 관리자 기능이 비활성화되어 있습니다. 환경 변수를 설정한 후 다시 시도해 주세요.
        </div>
      )}
      {authReady && !authLoading && !user && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <div>관리자 페이지는 로그인 후에만 접근할 수 있습니다. Google 계정으로 로그인해 주세요.</div>
          <button
            onClick={signIn}
            className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
          >
            로그인
          </button>
        </div>
      )}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {!error && !stats && <p className="text-sm text-slate-600">통계 불러오는 중...</p>}
        {stats && (
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="전체 링크" value={stats.totalLinks} />
            <StatCard label="활성 링크" value={stats.activeLinks} />
            <StatCard label="총 클릭" value={stats.totalClicks} />
            {typeof stats.last7 === 'number' && <StatCard label="최근 7일 클릭" value={stats.last7} />}
            {typeof stats.last30 === 'number' && <StatCard label="최근 30일 클릭" value={stats.last30} />}
            {stats.devices && (
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="text-sm text-slate-500">디바이스</div>
                <div className="mt-1 text-sm text-slate-700">
                  모바일 {stats.devices.mobile.toLocaleString()} / 데스크톱 {stats.devices.desktop.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span>범위:</span>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-full px-3 py-1 font-semibold ${
                days === d ? 'bg-brand-100 text-brand-700' : 'border border-slate-200 text-slate-600'
              }`}
            >
              {d}일
            </button>
          ))}
          {stats && <span className="text-slate-500">응답 범위: {stats.rangeDays ?? days}일</span>}
        </div>
      </div>
      {stats?.daily && stats.daily.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">최근 30일 클릭 추세</h2>
          <SparkBars data={stats.daily} />
        </div>
      )}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">최근 활동 로그</h2>
        {logs.length === 0 && <p className="text-sm text-slate-600 mt-2">로그가 없습니다.</p>}
        {logs.length > 0 && (
          <div className="mt-3 overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">시간</th>
                  <th className="px-3 py-2">액션</th>
                  <th className="px-3 py-2">링크 ID</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-600">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{log.action}</td>
                    <td className="px-3 py-2 text-slate-600">{log.link_id ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {stats?.referrers && stats.referrers.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">상위 리퍼러</h2>
          <ReferrerBars data={stats.referrers} />
        </div>
      )}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">커스텀 도메인 연결 가이드</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>원하는 도메인을 구매한 뒤 DNS 관리로 이동합니다.</li>
          <li>Vercel 프로젝트에 도메인을 추가하고, 안내받은 CNAME/ALIAS를 설정합니다.</li>
          <li>`SITE_URL` / `VITE_SITE_URL`을 도메인으로 업데이트 후 다시 배포합니다.</li>
          <li>HTTPS가 활성화되면 슬러그 생성 결과 링크가 새 도메인으로 표시됩니다.</li>
        </ol>
        <p className="mt-2 text-xs text-slate-500">
          도메인마다 전파가 최대 수십 분 소요될 수 있습니다. 기본 도메인은 항상 fallback으로 유지됩니다.
        </p>
      </div>
      {health && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">환경 설정 상태</h2>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            <li>사이트 URL: {health.siteUrl}</li>
            <li>Supabase URL: {health.supabaseUrl}</li>
            <li>Service Role Key: {health.supabaseKey}</li>
            <li>Anon Key: {health.anonKey}</li>
            <li>Safe Browsing: {health.safeBrowsing ? '활성' : '비활성'}</li>
          </ul>
          {!health.safeBrowsing && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Safe Browsing API 키가 설정되지 않았습니다. 악성 URL 차단을 위해 `SAFE_BROWSING_API_KEY`를 환경 변수에 추가해 주세요.
            </div>
          )}
          {(health.supabaseKey === 'missing' || health.anonKey === 'missing') && (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              Supabase 키가 누락되었습니다. Vercel 환경 변수에 `VITE_SUPABASE_ANON_KEY`와 `SUPABASE_SERVICE_ROLE_KEY`를 확인해 주세요.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
    <div className="text-sm text-slate-500">{label}</div>
    <div className="mt-1 text-2xl font-semibold text-slate-900">{value.toLocaleString()}</div>
  </div>
)

const SparkBars = ({ data }: { data: { date: string; count: number }[] }) => {
  const max = Math.max(...data.map((d) => d.count), 1)
  return (
    <div className="mt-4 flex items-end gap-1 overflow-x-auto">
      {data.map((d) => (
        <div key={d.date} className="flex flex-col items-center gap-1 text-[10px] text-slate-500">
          <div
            className="w-2 rounded-t bg-brand-500"
            style={{ height: `${Math.max(8, (d.count / max) * 80)}px` }}
            title={`${d.date}: ${d.count}`}
          />
        </div>
      ))}
    </div>
  )
}

const ReferrerBars = ({ data }: { data: { referrer: string; count: number }[] }) => {
  const max = Math.max(...data.map((d) => d.count), 1)
  return (
    <div className="mt-3 space-y-2 text-sm text-slate-700">
      {data.map((r) => (
        <div key={r.referrer} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="truncate pr-2">{r.referrer}</span>
            <span className="font-semibold text-slate-900">{r.count.toLocaleString()}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-brand-500"
              style={{ width: `${Math.max(4, (r.count / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default Admin

