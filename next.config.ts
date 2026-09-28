import type { NextConfig } from "next";

// Set when deploying under a sub-path, e.g. GitHub Pages at /japp.
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  allowedDevOrigins: ["192.168.129.4", "100.71.249.87"],
};

export default nextConfig;
