/**
 * dev-image-preview-shadow-test.ts — shadow DOM 宿主 + 应用浮层的弹窗测试页(仅 dev)
 *
 * 模拟面板类宿主应用:meditor 挂在 shadow root 内,同时 body 层存在一个
 * 全屏 backdrop(z-index 99999,模拟应用下拉菜单的点击捕获层)。
 * 双击图片打开预览弹窗后可验证:弹窗是否置顶可点(关闭/绘制/应用)。
 */
import { createMeditor, type MeditorApi } from '@meditor/editor';
import { meditorStyleText } from '../vendor/meditor/style-inline.js';

const panel = document.getElementById('panel');
if (panel) {
  // --- shadow root 内挂载编辑器(样式仅存在于 shadow root) ---
  const shadow = panel.attachShadow({ mode: 'open' });
  const styleElement = document.createElement('style');
  styleElement.textContent = meditorStyleText;
  shadow.appendChild(styleElement);
  const editorHost = document.createElement('div');
  shadow.appendChild(editorHost);

  const api = createMeditor({
    root: editorHost,
    defaultValue: '![初始图片](http://localhost:5183/test-image.png)\n',
    locale: 'zh-CN',
    theme: 'light',
    toolbar: { mode: 'full', align: 'center' }
  });
  (window as unknown as { __meditorApi: MeditorApi }).__meditorApi = api;

  // --- 模拟应用浮层:全屏 backdrop + 可见下拉面板(都挂 body 层) ---
  const backdrop = document.createElement('div');
  backdrop.id = 'app-backdrop';
  backdrop.style.cssText =
    'position:fixed;inset:0;z-index:99999;background:rgba(255,255,255,0.005)';
  document.body.appendChild(backdrop);

  const dropdown = document.createElement('div');
  dropdown.id = 'app-dropdown';
  dropdown.style.cssText =
    'position:fixed;right:40px;top:40px;z-index:100000;background:#fff;' +
    'border:1px solid #ddd;border-radius:8px;padding:12px 20px;' +
    'font:14px/1.6 sans-serif;color:#333;box-shadow:0 8px 24px rgba(0,0,0,.15)';
  dropdown.textContent = '应用下拉菜单(挂 body 层,z-index 100000)';
  document.body.appendChild(dropdown);

  let backdropClicks = 0;
  backdrop.addEventListener('pointerdown', () => {
    backdropClicks += 1;
  });
  (window as unknown as { __backdropClicks: () => number }).__backdropClicks = () => backdropClicks;
}
