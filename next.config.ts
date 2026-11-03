import type { NextConfig } from "next";
const config: NextConfig = { distDir: process.env.SUELORUTA_DIST_DIR || ".next-phase2", serverExternalPackages: ["node:sqlite"], poweredByHeader: false, outputFileTracingRoot: process.cwd() };
export default config;
