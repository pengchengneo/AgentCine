import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const nextConfig: NextConfig = {
  // 已删除 ignoreBuildErrors / ignoreDuringBuilds，构建保持严格门禁
  // Next 15 的 allowedDevOrigins 是顶层配置，不属于 experimental
  allowedDevOrigins: [
    'http://192.168.31.218:3000',
    'http://192.168.31.*:3000',
  ],
  // Remotion 渲染依赖包含 esbuild 原生二进制，必须排除在 Turbopack 之外
  serverExternalPackages: [
    '@remotion/bundler',
    '@remotion/renderer',
    'esbuild',
  ],
};

export default withNextIntl(nextConfig);
