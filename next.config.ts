import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Desligado: mesmo no topo-direito, o portal do overlay de dev do Next
  // intercepta cliques na bottom-nav no viewport mobile (Playwright). Esse
  // overlay só existe em dev — em produção (static export) nem é gerado.
  devIndicators: false,
  images: {
    unoptimized: true,
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },

  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
