/** @type {import('next').NextConfig} */
const dotenv = require('dotenv')

dotenv.config()


const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['firebasestorage.googleapis.com' ,'arweave.net', 'nftstorage.link', 'ipfs.com', 'cf-ipfs.com'],
  },
  poweredByHeader: false,
  productionBrowserSourceMaps: true,
};

module.exports = nextConfig;