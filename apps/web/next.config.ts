import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
};

export default withWorkflow(nextConfig);
