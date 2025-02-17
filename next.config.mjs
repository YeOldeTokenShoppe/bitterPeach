/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**",
      },
    ],
  },
  webpack: (config, { isServer, dev }) => {
    // Enable source maps in production
    if (!dev && !isServer) {
      config.devtool = "source-map";
    }

    // Add support for .glsl, .vs, and .fs files
    config.module.rules.push({
      test: /\.(glsl|vs|fs)$/,
      use: [
        {
          loader: "raw-loader", // Loads GLSL files as strings
        },
        {
          loader: "glslify-loader", // Optional: Preprocess GLSL for imports and macros
        },
      ],
    });

    return config;
  },
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
  },
};

export default nextConfig;
