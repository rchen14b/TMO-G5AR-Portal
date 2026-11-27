/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Next.js 16 serves dev-only assets only to localhost. A browser opened at
  // the LAN or Tailscale address gets the HTML, then a 403 on the module
  // scripts, so the login form never hydrates and Sign In just reloads.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "100.*.*.*"],
  // Ensure images from public folder work in standalone mode
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
