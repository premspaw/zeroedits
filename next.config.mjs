/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Remotion's bundler/renderer ship native binaries (rspack, esbuild, compositor).
    // They must be loaded by Node at runtime, not bundled by Next's webpack.
    serverComponentsExternalPackages: [
      "@remotion/bundler",
      "@remotion/renderer",
      "@remotion/compositor-win32-x64-msvc",
      "@rspack/core",
      "@rspack/binding",
      "@rspack/binding-win32-x64-msvc",
      "esbuild",
    ],
  },
};

export default nextConfig;
