import type { MetadataRoute } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://readylayer.dev'

const routes = [
  '/',
  '/how-it-works',
  '/open-source',
  '/docs',
  '/integrations',
  '/governance',
  '/security',
  '/enterprise',
  '/changelog',
  '/about',
]

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }))
}
