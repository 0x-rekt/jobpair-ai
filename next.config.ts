import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ["https://special-oriole-remotely.ngrok-free.app"],
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
