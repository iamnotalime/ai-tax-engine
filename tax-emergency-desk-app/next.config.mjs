/** @type {import('next').NextConfig} */
const productionSecurityHeaders = process.env.APP_ENV === 'production';
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  productionSecurityHeaders ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  productionSecurityHeaders ? "connect-src 'self'" : "connect-src 'self' ws: wss:",
  "worker-src 'self' blob:",
  ...(productionSecurityHeaders ? ['upgrade-insecure-requests'] : [])
].join('; ');

const nextConfig = {
  typedRoutes: true,
  serverExternalPackages: ['@temporalio/client'],
  experimental: {
    serverActions: { bodySizeLimit: '25mb' }
  },
  poweredByHeader: false,
  async headers() {
    const headers = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), interest-cohort=()' },
      { key: 'Content-Security-Policy', value: contentSecurityPolicy },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
      { key: 'X-DNS-Prefetch-Control', value: 'off' }
    ];
    if (productionSecurityHeaders) {
      headers.push({ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' });
    }
    return [
      {
        source: '/(.*)',
        headers
      }
    ];
  }
};
export default nextConfig;
