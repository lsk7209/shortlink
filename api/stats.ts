import { createClient } from '@supabase/supabase-js'

export const config = {
  runtime: 'edge',
}

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Supabase 환경 변수가 설정되지 않았습니다.')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false } })

const getUserFromAuth = async (req: Request) => {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.replace('Bearer ', '')
  const {
    data: { user },
  } = await supabase.auth.getUser(token)
  return user
}

export default async function handler(req: Request) {
  const user = await getUserFromAuth(req)
  if (!user) return new Response(JSON.stringify({ error: '로그인이 필요합니다.' }), { status: 401 })
  const isAdmin = user.app_metadata?.role === 'admin'

  const url = new URL(req.url)
  const daysParam = Number(url.searchParams.get('days') ?? 30)
  const rangeDays = Math.min(Math.max(daysParam, 7), 90)

  const base = supabase.from('short_links').select('id, click_count, active').order('created_at', { ascending: false })
  const { data, error } = isAdmin ? await base : await base.eq('owner_id', user.id)
  if (error) return new Response(JSON.stringify({ error: '통계 조회 중 오류가 발생했습니다.' }), { status: 500 })

  const totalLinks = data.length
  const activeLinks = data.filter((d) => d.active).length
  const totalClicks = data.reduce((sum, row) => sum + (row.click_count ?? 0), 0)

  const sinceMs = Date.now() - rangeDays * 24 * 60 * 60 * 1000
  const since = new Date(sinceMs).toISOString()
  let eventsQuery = supabase
    .from('click_events')
    .select('clicked_at, referrer, ua')
    .gte('clicked_at', since)
    .order('clicked_at', { ascending: false })
  if (!isAdmin) {
    const linkIds = data.map((d) => d.id)
    eventsQuery = eventsQuery.in('link_id', linkIds)
  }
  const { data: events } = await eventsQuery

  const last7Cut = Date.now() - 7 * 24 * 60 * 60 * 1000
  const last30Cut = Date.now() - 30 * 24 * 60 * 60 * 1000
  let last7 = 0
  let last30 = 0
  const refCount: Record<string, number> = {}
  let mobile = 0
  let desktop = 0
  const daily: Record<string, number> = {}

  for (const ev of events ?? []) {
    const ts = new Date(ev.clicked_at ?? 0).getTime()
    if (ts >= last7Cut) last7 += 1
    if (ts >= last30Cut) last30 += 1
    if (ts >= sinceMs) {
      const d = new Date(ts)
      const key = d.toISOString().slice(0, 10)
      daily[key] = (daily[key] ?? 0) + 1
    }
    if (ev.referrer) {
      refCount[ev.referrer] = (refCount[ev.referrer] ?? 0) + 1
    }
    const ua = (ev.ua ?? '').toLowerCase()
    if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) mobile += 1
    else desktop += 1
  }

  const referrers = Object.entries(refCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ref, count]) => ({ referrer: ref, count }))

  const dailySeries = Object.entries(daily)
    .sort((a, b) => (a[0] > b[0] ? 1 : -1))
    .map(([date, count]) => ({ date, count }))

  return new Response(
    JSON.stringify({
      totalLinks,
      activeLinks,
      totalClicks,
      last7,
      last30,
      referrers,
      devices: { mobile, desktop },
      daily: dailySeries,
      rangeDays,
    }),
    { status: 200 },
  )
}

