import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../lib/api'
import { useAuth } from '../lib/auth'
import { usePageMeta } from '../lib/seo'
import { slugSchema, urlSchema } from '../lib/slug'
import QRCode from 'qrcode'

type LinkResponse = {
  link: {
    id: string
    slug: string
    target_url: string
    click_limit?: number | null
    expires_at?: string | null
  }
}

type AvailabilityResponse = { available: boolean }

const Home = () => {
  const { user, loading: authLoading } = useAuth()
  const [url, setUrl] = useState('')
  const [slug, setSlug] = useState('')
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [qrData, setQrData] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState('')
  const [clickLimit, setClickLimit] = useState<string>('')
  const [qrFileName, setQrFileName] = useState('short-link-qr.png')
  const [shareMessage, setShareMessage] = useState<string | null>(null)
  const [qrFormat, setQrFormat] = useState<'png' | 'svg'>('png')

  const shortDomain = useMemo(() => {
    return (import.meta.env.VITE_SITE_URL as string | undefined) ?? window.location.origin
  }, [])

  usePageMeta({
    title: '단축 링크 생성 | shorty.link',
    description: '커스텀 슬러그, 만료, 통계가 가능한 회원제 숏링크 서비스를 시작하세요.',
    canonical: `${shortDomain}/`,
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      const value = slug.trim()
      if (!value) {
        setAvailable(null)
        return
      }
      const parsed = slugSchema.safeParse(value)
      if (!parsed.success) {
        setAvailable(null)
        setError(parsed.error.errors[0]?.message ?? '슬러그 형식이 올바르지 않습니다.')
        return
      }
      setError(null)
      setChecking(true)
      apiFetch<AvailabilityResponse>(`/api/links?slug=${value}`)
        .then((res) => setAvailable(res.available))
        .catch(() => setAvailable(null))
        .finally(() => setChecking(false))
    }, 400)
    return () => clearTimeout(timer)
  }, [slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)

    const urlValid = urlSchema.safeParse(url.trim())
    if (!urlValid.success) {
      setError(urlValid.error.errors[0]?.message ?? 'URL을 확인해 주세요.')
      return
    }
    if (slug) {
      const slugValid = slugSchema.safeParse(slug.trim())
      if (!slugValid.success) {
        setError(slugValid.error.errors[0]?.message ?? '슬러그를 확인해 주세요.')
        return
      }
    }
    try {
      setSubmitting(true)
      const res = await apiFetch<LinkResponse>('/api/links', {
        method: 'POST',
        body: {
          url: url.trim(),
          slug: slug.trim() || undefined,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
          clickLimit: clickLimit ? Number(clickLimit) : undefined,
        },
        token: user?.accessToken,
      })
      const shortUrl = `${shortDomain}/r/${res.link.slug}`
      setResult(shortUrl)
      if (qrFormat === 'png') {
        const qr = await QRCode.toDataURL(shortUrl, { margin: 1, width: 256 })
        setQrData(qr)
        setQrFileName(`qr-${res.link.slug}.png`)
      } else {
        const svgString = await QRCode.toString(shortUrl, { type: 'svg', margin: 1, width: 256 })
        const base64 = window.btoa(svgString)
        setQrData(`data:image/svg+xml;base64,${base64}`)
        setQrFileName(`qr-${res.link.slug}.svg`)
      }
      setShareMessage(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '생성 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }
  const shareLink = async () => {
    if (!result) return
    if (navigator.share) {
      try {
        await navigator.share({ title: 'shorty.link', text: '단축 링크 공유', url: result })
        setShareMessage('공유가 완료되었습니다.')
      } catch {
        setShareMessage('공유가 취소되었습니다.')
      }
    } else {
      await navigator.clipboard.writeText(result)
      setShareMessage('클립보드에 복사했습니다.')
    }
  }

  const copyResult = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result)
    setError('클립보드에 복사했습니다.')
  }

  return (
    <div className="grid gap-10">
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <p className="w-fit rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            회원제 단축 링크 · 커스텀 슬러그
          </p>
          <h1 className="text-3xl font-bold leading-tight text-slate-900">
            링크를 짧고 안전하게. <span className="text-brand-600">내 도메인</span>으로 관리하세요.
          </h1>
          <p className="max-w-2xl text-base text-slate-600">
            로그인 후 URL을 붙여넣고 커스텀 슬러그를 입력하면 끝. 클릭 수, 만료 설정, 비활성화까지 한 곳에서 관리합니다.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 grid gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <label className="grid gap-1 text-sm text-slate-700">
              원본 URL
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                placeholder="https://example.com/article"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              커스텀 슬러그(선택)
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{shortDomain}/r/</span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="my-link"
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                />
                {checking && <span className="text-xs text-slate-500">확인 중...</span>}
                {available === true && <span className="text-xs text-emerald-600">사용 가능</span>}
                {available === false && <span className="text-xs text-rose-600">이미 사용 중</span>}
              </div>
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={submitting || authLoading}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? '생성 중...' : '단축 링크 생성'}
              </button>
              {error && <span className="text-sm text-rose-600">{error}</span>}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-sm text-slate-700">
                만료 시각(선택)
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-700">
                클릭 한도(선택)
                <input
                  type="number"
                  min={1}
                  value={clickLimit}
                  onChange={(e) => setClickLimit(e.target.value)}
                  placeholder="예: 100"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                />
              </label>
              <label className="grid gap-1 text-sm text-slate-700">
                QR 포맷
                <div className="flex gap-3 text-xs text-slate-700">
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name="qr-format"
                      value="png"
                      checked={qrFormat === 'png'}
                      onChange={() => setQrFormat('png')}
                    />
                    PNG
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name="qr-format"
                      value="svg"
                      checked={qrFormat === 'svg'}
                      onChange={() => setQrFormat('svg')}
                    />
                    SVG
                  </label>
                </div>
              </label>
            </div>

            {result && (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                <a className="font-semibold text-brand-700" href={result} target="_blank" rel="noreferrer">
                  {result}
                </a>
                <button
                  type="button"
                  onClick={copyResult}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-brand-200 hover:text-brand-700"
                >
                  복사
                </button>
                <button
                  type="button"
                  onClick={shareLink}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-brand-200 hover:text-brand-700"
                >
                  공유
                </button>
                {shareMessage && <span className="text-xs text-slate-600">{shareMessage}</span>}
              </div>
            )}
            {qrData && (
              <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white px-3 py-3">
                <img src={qrData} alt="단축 링크 QR 코드" className="h-28 w-28" />
                <div className="text-sm text-slate-600">
                  QR 코드가 생성되었습니다. 이미지를 길게 눌러 저장하거나 복사해 공유하세요.
                  <div className="mt-2">
                    <a
                      href={qrData}
                      download={qrFileName}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-brand-200 hover:text-brand-700"
                    >
                      QR 다운로드
                    </a>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </section>
      <section className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:grid-cols-3">
        {[
          { title: '커스텀 슬러그', desc: '중복 확인과 만료 설정을 한 번에 처리합니다.' },
          { title: '클릭 통계', desc: '최근 7/30일 추세, 리퍼러, 디바이스를 집계합니다.' },
          { title: '관리자/사용자', desc: '관리자는 전체 관리, 사용자는 본인 링크만 관리합니다.' },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
          </div>
        ))}
      </section>
    </div>
  )
}

export default Home

