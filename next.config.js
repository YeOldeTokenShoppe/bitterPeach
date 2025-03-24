/** @type {import('next/config').NextConfig} */
const nextConfig = {
  // Try adding this to disable strict mode temporarily
  reactStrictMode: false,

  // Important: DON'T add output: 'export' if you use SSR features
  // If you need SSR, leave this out
  // output: "export",

  // Disable image optimization for static deployments
  images: {
    unoptimized: true,
  },

  // Temporarily disable TypeScript checking for build
  typescript: {
    ignoreBuildErrors: true,
  },

  // Temporarily disable ESLint for build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Add needed transpilation
  transpilePackages: ["@react-three/drei", "three"],

  // Add webpack configuration for shaders if needed
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      exclude: /node_modules/,
      use: ["raw-loader", "glslify-loader"],
    });

    return config;
  },
};

module.exports = nextConfig;
