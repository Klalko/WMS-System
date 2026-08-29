import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from Supabase storage
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
  // Reduce bundle size by excluding server-only packages from client
  serverExternalPackages: ["@prisma/client"],
  allowedDevOrigins: ["172.20.10.2", "ce4ca0e2d21eff.lhr.life", "4e2708287b5f63.lhr.life", "flat-aliens-rush.loca.lt"],
};

export default nextConfig;
