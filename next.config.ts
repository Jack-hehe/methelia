import type { NextConfig } from "next";
const config: NextConfig = {
  devIndicators: false,
  distDir:
    process.env.METHELIA_TEST_BUILD === "1" ? ".next-validation" : ".next",
};
export default config;
