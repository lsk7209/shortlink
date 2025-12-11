const pages = ['/', '/links', '/admin', '/about', '/contact', '/privacy', '/terms']

export const config = {
  runtime: 'edge',
}

export default async function handler() {
  const base = process.env.SITE_URL ?? 'https://example.com'
  const urls = pages
    .map(
      (path) => `<url>
  <loc>${base}${path}</loc>
  <changefreq>daily</changefreq>
  <priority>${path === '/' ? '1.0' : '0.7'}</priority>
</url>`,
    )
    .join('\n')

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}

