import type { NextConfig } from "next";

// SEC-2 follow-up: same-site API proxy.
//
// The session is an httpOnly cookie set by the backend. When the browser calls
// the backend on a different site (Vercel frontend -> Render backend), many
// browsers block that cookie as a third-party cookie. Routing API calls through
// this app's own origin (/api/* -> backend) keeps the cookie first-party.
//
// Deployed (Vercel) environment variables:
//   BACKEND_ORIGIN=https://<render-backend-host>   where /api/* is forwarded to
//   NEXT_PUBLIC_API_URL=/                          browser calls same-origin /api/*
//
// Local dev needs neither: without BACKEND_ORIGIN no rewrite is added and the
// browser keeps calling http://localhost:3000 directly (frontend/lib/api.ts).
const backendOrigin = process.env.BACKEND_ORIGIN?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    if (!backendOrigin) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
