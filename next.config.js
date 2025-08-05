/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['node-pty'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig