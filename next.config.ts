import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

/** Next.js only auto-loads `.env*`. Project secrets live in `.secret` (see docs/SPECIFICATION.md). */
const secretPath = resolve(process.cwd(), ".secret");
if (existsSync(secretPath)) {
  loadEnv({ path: secretPath, quiet: true });
}

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
