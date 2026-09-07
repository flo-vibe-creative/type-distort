import path from 'path'
import { fileURLToPath } from 'url'

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 상위 vibe 폴더에 lockfile이 있어 Next가 workspace root를 잘못 추론하면
  // dev 파일 감시 범위가 거대해져 기동이 멈춘다. 이 폴더로 고정한다.
  outputFileTracingRoot: __dirname,

  // 상위 앱의 하위 라우트로 서비스할 때 prefix 적용
  basePath: BASE_PATH || undefined,
  assetPrefix: BASE_PATH || undefined,

  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  images: {
    unoptimized: true,
  },

  // 정적 빌드(output: 'export')에는 서버가 없어 헤더를 붙일 수 없다.
  // 개발 중 같은 제약으로 확인할 수 있도록 dev에서만 적용한다.
  // 실제 배포 시에는 서버(nginx 등)에서 같은 헤더를 내려줘야 한다.
  async headers() {
    if (process.env.NODE_ENV === 'production') return []
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
              "worker-src 'self' blob:",
              "style-src 'self' 'unsafe-inline'",
              // 사용자가 가져오는 SVG/PNG는 data:·blob: URL로만 다룬다
              "img-src 'self' data: blob:",
              "connect-src 'self' blob: data:",
              "font-src 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
