/**
 * dev-image-preview-test.ts — 图片预览编辑弹窗的手工测试挂载页(仅 dev 使用)
 *
 * 直挂 meditor 并预置一张站内图片,浏览器访问 /dev-image-preview-test.html
 * 即可双击图片验证预览编辑弹窗;不参与生产构建。
 */
import '@meditor/editor/style.css';
import { createMeditor } from '@meditor/editor';

const host = document.getElementById('app');
if (host) {
  const api = createMeditor({
    root: host,
    defaultValue: '![初始图片](http://localhost:5183/test-image.png)\n',
    locale: 'zh-CN',
    theme: 'light',
    toolbar: { mode: 'full', align: 'center' }
  });
  // 供自动化断言文档内容。
  (window as unknown as { __meditorApi: typeof api }).__meditorApi = api;
}
