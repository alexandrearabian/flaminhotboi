import type { NextConfig } from 'next'

const config: NextConfig = {
  // ponytail: always English at "/"; add proxy.ts with Accept-Language if Spanish visitors should land on /es.
  redirects: async () => [{ source: '/', destination: '/en', permanent: false }],
}

export default config
