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

  let query = supabase
    .from('link_logs')
    .select('id, action, created_at, link_id, actor_id')
    .order('created_at', { ascending: false })
    .limit(50)

  if (!isAdmin) {
    query = query.eq('actor_id', user.id)
  }

  const { data, error } = await query
  if (error) return new Response(JSON.stringify({ error: '로그 조회 중 오류가 발생했습니다.' }), { status: 500 })
  return new Response(JSON.stringify({ logs: data }), { status: 200 })
}

