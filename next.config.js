/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Ensure images from public folder work in standalone mode
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
