import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { generateSlug, slugSchema, urlSchema } from '../src/lib/slug'

export const config = {
  runtime: 'edge',
}

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Supabase 환경 변수가 설정되지 않았습니다.')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false } })
const PUBLIC_OWNER = '00000000-0000-0000-0000-000000000000'

const bodySchema = z.object({
  url: urlSchema,
  slug: slugSchema.optional(),
  expiresAt: z.string().datetime().optional(),
  clickLimit: z.number().int().positive().optional(),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  active: z.boolean().optional(),
})

const safeBrowsingKey = process.env.SAFE_BROWSING_API_KEY
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 50
const IP_RATE_LIMIT_MAX = 80

function hashIp(ip: string | null) {
  if (!ip) return null
  // 간단한 해시: 앞 6자리만 사용
  return ip.slice(0, 12)
}

async function checkSafeBrowsing(url: string) {
  if (!safeBrowsingKey) return { safe: true }
  try {
    const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${safeBrowsingKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { clientId: 'shorty-link', clientVersion: '1.0' },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'THREAT_TYPE_UNSPECIFIED', 'UNWANTED_SOFTWARE'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url }],
        },
      }),
    })
    if (!res.ok) return { safe: true }
    const data = (await res.json()) as { matches?: unknown[] }
    return { safe: !(data.matches && data.matches.length > 0) }
  } catch (_err) {
    return { safe: true } // 실패 시 허용하지만 로깅 가능
  }
}

async function checkRateLimit(userId: string) {
  const windowStart = new Date(Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS).toISOString()
  // upsert 카운트 증가
  const { data, error } = await supabase
    .from('rate_limits')
    .upsert({ user_id: userId, window_start: windowStart, count: 1 }, { onConflict: 'user_id,window_start' })
    .select('*')
    .maybeSingle()

  if (error) return false
  // 만약 기존 행이 있다면 추가로 +1
  if (data && data.count === 1) {
    // 새로 생성된 행이므로 현재 count는 1
    return data.count > RATE_LIMIT_MAX
  }
  // 기존 값이면 다시 한번 증가
  const { data: updated } = await supabase
    .from('rate_limits')
    .update({ count: (data?.count ?? 0) + 1 })
    .eq('user_id', userId)
    .eq('window_start', windowStart)
    .select('count')
    .maybeSingle()
  return (updated?.count ?? 0) > RATE_LIMIT_MAX
}

async function checkIpRateLimit(ip: string | null) {
  const hashed = hashIp(ip)
  if (!hashed) return false
  const windowStart = new Date(Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS).toISOString()
  const { data, error } = await supabase
    .from('ip_limits')
    .upsert({ ip_hash: hashed, window_start: windowStart, count: 1 }, { onConflict: 'ip_hash,window_start' })
    .select('*')
    .maybeSingle()
  if (error) return false
  if (data && data.count === 1) return data.count > IP_RATE_LIMIT_MAX
  const { data: updated } = await supabase
    .from('ip_limits')
    .update({ count: (data?.count ?? 0) + 1 })
    .eq('ip_hash', hashed)
    .eq('window_start', windowStart)
    .select('count')
    .maybeSingle()
  return (updated?.count ?? 0) > IP_RATE_LIMIT_MAX
}

const getUserFromAuth = async (req: Request) => {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.replace('Bearer ', '')
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

export default async function handler(req: Request) {
  if (req.method === 'POST') {
    return handleCreate(req)
  }
  if (req.method === 'GET') {
    return handleList(req)
  }
  if (req.method === 'PATCH') {
    return handleUpdate(req)
  }
  if (req.method === 'DELETE') {
    return handleDelete(req)
  }
  return new Response(JSON.stringify({ error: '지원하지 않는 메서드입니다.' }), { status: 405 })
}

async function handleCreate(req: Request) {
  const user = await getUserFromAuth(req)

  const json = await req.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.errors[0]?.message ?? '입력이 올바르지 않습니다.' }), {
      status: 400,
    })
  }
  const { url, expiresAt, clickLimit } = parsed.data
  const slug = parsed.data.slug ?? generateSlug()

  const { data: conflict } = await supabase.from('short_links').select('slug').eq('slug', slug).maybeSingle()
  if (conflict) {
    return new Response(JSON.stringify({ error: '이미 사용 중인 슬러그입니다.' }), { status: 409 })
  }

  const ownerId = user?.id ?? PUBLIC_OWNER

  const limited = await checkRateLimit(ownerId)
  if (limited) {
    return new Response(JSON.stringify({ error: '짧은 시간 내 생성 한도를 초과했습니다. 잠시 후 다시 시도하세요.' }), {
      status: 429,
    })
  }

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const ipLimited = await checkIpRateLimit(clientIp)
  if (ipLimited) {
    return new Response(JSON.stringify({ error: '이 IP에서 생성 한도를 초과했습니다. 잠시 후 다시 시도하세요.' }), {
      status: 429,
    })
  }

  const safe = await checkSafeBrowsing(url)
  if (!safe.safe) {
    return new Response(JSON.stringify({ error: '위험이 감지된 URL입니다. 다른 링크를 사용해 주세요.' }), { status: 400 })
  }

  const { data, error } = await supabase
    .from('short_links')
    .insert({
      slug,
      target_url: url,
      owner_id: ownerId,
      expires_at: expiresAt ?? null,
      click_limit: clickLimit ?? null,
    })
    .select()
    .maybeSingle()

  if (error) {
    return new Response(JSON.stringify({ error: '링크 생성 중 오류가 발생했습니다.' }), { status: 500 })
  }

  if (data) {
    await supabase.from('link_logs').insert({
      link_id: data.id,
      actor_id: ownerId,
      action: 'create',
    })
  }

  return new Response(JSON.stringify({ link: data }), { status: 201 })
}

async function handleList(req: Request) {
  const url = new URL(req.url)
  const slugCheck = url.searchParams.get('slug')
  if (slugCheck) {
    const parsedSlug = slugSchema.safeParse(slugCheck)
    if (!parsedSlug.success) {
      return new Response(JSON.stringify({ error: parsedSlug.error.errors[0]?.message }), { status: 400 })
    }
    const { data: existing } = await supabase.from('short_links').select('slug').eq('slug', slugCheck).maybeSingle()
    return new Response(JSON.stringify({ available: !existing }), { status: 200 })
  }

  const user = await getUserFromAuth(req)
  const isAdmin = user?.app_metadata?.role === 'admin'
  const status = url.searchParams.get('status')
  const search = url.searchParams.get('search')

  let query = supabase.from('short_links').select('*').order('created_at', { ascending: false }).limit(100)
  if (status === 'active') query = query.eq('active', true)
  if (status === 'inactive') query = query.eq('active', false)
  if (search) {
    query = query.or(`slug.ilike.%${search}%,target_url.ilike.%${search}%`)
  }

  const { data, error } = user
    ? isAdmin
      ? await query
      : await query.eq('owner_id', user.id)
    : await query.eq('active', true).limit(20)
  if (error) {
    return new Response(JSON.stringify({ error: '목록 조회 중 오류가 발생했습니다.' }), { status: 500 })
  }
  return new Response(JSON.stringify({ links: data }), { status: 200 })
}

async function handleUpdate(req: Request) {
  const user = await getUserFromAuth(req)
  if (!user) return new Response(JSON.stringify({ error: '로그인이 필요합니다.' }), { status: 401 })
  const isAdmin = user.app_metadata?.role === 'admin'
  const json = await req.json().catch(() => ({}))
  const parsed = updateSchema.safeParse(json)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.errors[0]?.message ?? '입력이 올바르지 않습니다.' }), {
      status: 400,
    })
  }
  const { id, active } = parsed.data
  const updatePayload: Record<string, unknown> = {}
  if (typeof active === 'boolean') updatePayload.active = active
  if (Object.keys(updatePayload).length === 0) {
    return new Response(JSON.stringify({ error: '변경할 필드가 없습니다.' }), { status: 400 })
  }
  const query = supabase.from('short_links').update(updatePayload).eq('id', id).select('*').maybeSingle()
  const { data, error } = isAdmin ? await query : await query.eq('owner_id', user.id)
  if (error || !data) {
    return new Response(JSON.stringify({ error: '업데이트 중 오류가 발생했습니다.' }), { status: 400 })
  }

  await supabase.from('link_logs').insert({
    link_id: data.id,
    actor_id: user.id,
    action: active === true ? 'activate' : active === false ? 'deactivate' : 'update',
  })
  return new Response(JSON.stringify({ link: data }), { status: 200 })
}

async function handleDelete(req: Request) {
  const user = await getUserFromAuth(req)
  if (!user) return new Response(JSON.stringify({ error: '로그인이 필요합니다.' }), { status: 401 })
  const isAdmin = user.app_metadata?.role === 'admin'
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return new Response(JSON.stringify({ error: 'id가 필요합니다.' }), { status: 400 })
  const query = supabase.from('short_links').delete().eq('id', id).select('id').maybeSingle()
  const { error } = isAdmin ? await query : await query.eq('owner_id', user.id)
  if (error) return new Response(JSON.stringify({ error: '삭제 중 오류가 발생했습니다.' }), { status: 400 })
  await supabase.from('link_logs').insert({
    link_id: id,
    actor_id: user.id,
    action: 'delete',
  })
  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}

