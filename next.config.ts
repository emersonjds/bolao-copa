import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // O indicador de dev fica fixo no canto inferior por padrão e, no viewport
  // mobile, cobre a aba mais à esquerda da bottom-nav (interceptando cliques).
  // Movido para o topo-direito; só afeta o dev server (não vai no static export).
  devIndicators: {
    position: "top-right",
  },
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
