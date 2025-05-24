import CopyWebpackPlugin from 'copy-webpack-plugin';

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

    // Copy Cesium static assets to public directory
    config.plugins.push(
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'node_modules/cesium/Build/Cesium/Workers',
            to: '../public/cesium/Workers',
          },
          {
            from: 'node_modules/cesium/Build/Cesium/ThirdParty',
            to: '../public/cesium/ThirdParty',
          },
          {
            from: 'node_modules/cesium/Build/Cesium/Assets',
            to: '../public/cesium/Assets',
          },
          {
            from: 'node_modules/cesium/Build/Cesium/Widgets',
            to: '../public/cesium/Widgets',
          },
        ],
      })
    );

    return config;
  },
  
  experimental: {
    esmExternals: false,
  },
  
  // Enable static file serving for Cesium assets
  assetPrefix: process.env.NODE_ENV === 'production' ? '/solar5d' : '',
};

export default nextConfig;
