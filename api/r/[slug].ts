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

export default async function handler(req: Request, ctx: { params: { slug: string } }) {
  const slug = ctx.params.slug
  if (!slug) {
    return new Response('슬러그가 없습니다.', { status: 400 })
  }

  const { data: link } = await supabase
    .from('short_links')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle()

  if (!link) {
    return new Response('존재하지 않는 링크입니다.', { status: 404 })
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return new Response('만료된 링크입니다.', { status: 410 })
  }

  if (link.click_limit && Number(link.click_limit) > 0 && link.click_count >= link.click_limit) {
    return new Response('클릭 한도를 초과했습니다.', { status: 410 })
  }

  await supabase
    .from('short_links')
    .update({ click_count: (link.click_count ?? 0) + 1 })
    .eq('id', link.id)
    .select('id')

  // 클릭 이벤트 기록 (실패해도 리다이렉트 진행)
  const referrer = req.headers.get('referer')
  const ua = req.headers.get('user-agent')
  const country = req.headers.get('x-vercel-ip-country') ?? req.headers.get('cf-ipcountry')
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  try {
    await supabase.from('click_events').insert({
      link_id: link.id,
      referrer,
      ua,
      country,
      ip_hash: ip ? ip.slice(0, 7) : null,
    })
  } catch (err) {
    console.error('click event log failed', err)
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: link.target_url,
      'Cache-Control': 'no-store',
    },
  })
}

