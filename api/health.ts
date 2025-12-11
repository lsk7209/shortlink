export const config = {
  runtime: 'edge',
}

export default async function handler() {
  const siteUrl = process.env.SITE_URL ?? process.env.VITE_SITE_URL ?? 'not-set'
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? 'not-set'
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing'
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ? 'set' : 'missing'
  const safeBrowsing = Boolean(process.env.SAFE_BROWSING_API_KEY)

  return new Response(
    JSON.stringify({
      siteUrl,
      supabaseUrl,
      supabaseKey,
      anonKey,
      safeBrowsing,
    }),
    { status: 200 },
  )
}

