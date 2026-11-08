import { defineConfig } from 'vitest/config';

/**
 * vitest.config.ts — @meditor/editor 测试配置
 *
 * - 覆盖编辑器本体 src/ 与三个子包(csvkit/jsonview/mtable)的源码测试
 * - 纯逻辑测试(node 环境),无需 DOM
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'packages/*/src/**/*.test.ts'],
  },
});
