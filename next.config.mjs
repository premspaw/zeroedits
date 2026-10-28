/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Remotion's bundler/renderer and ONNX runtime ship native binaries.
    // They must be loaded by Node at runtime, not bundled by Next's webpack.
    serverComponentsExternalPackages: [
      "@xenova/transformers",
      "onnxruntime-node",
      "@remotion/bundler",
      "@remotion/renderer",
      "@remotion/compositor-win32-x64-msvc",
      "@rspack/core",
      "@rspack/binding",
      "@rspack/binding-win32-x64-msvc",
      "esbuild",
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("@xenova/transformers", "onnxruntime-node");
    }
    return config;
  },
};

export default nextConfig;
