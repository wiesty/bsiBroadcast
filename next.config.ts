import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  output: 'standalone',
  allowedDevOrigins: ['192.168.178.49'],
}

export default nextConfig
