/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Handle Cesium module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        url: false,
        crypto: false,
      };
    }

    // Handle Cesium workers and assets
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules\/cesium/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
          compact: false,
        },
      },
    });

    return config;
  },
  
  experimental: {
    esmExternals: false,
  },
};

export default nextConfig;
