/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Webpack config pour pdf-parse
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'pdf-parse': 'commonjs pdf-parse',
      })
    }
    return config
  },
}

module.exports = nextConfig
