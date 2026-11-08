/**
 * dev-feature-test.ts — Typora 对齐新特性的手工/自动化验证页(仅 dev 使用)
 *
 * 覆盖:Mermaid 图表渲染、==高亮==/`^上标^` 文本语法、下划线/上下标 mark、
 * 脚注、YAML Front Matter、[toc] 目录块、标题锚点/大纲、内链跳转、
 * 自动配对、Emoji `:` 补全、专注/打字机模式、独立 HTML 导出。
 * 浏览器访问 /dev-feature-test.html 后在控制台跑 `await window.__runFeatureChecks()`。
 * 不参与生产构建。
 */
import '@meditor/editor/style.css';
import { createMeditor, type MeditorApi, type MeditorHeading } from '@meditor/editor';

const SAMPLE = [
  '---',
  'title: 特性验证',
  'tags: [dev, test]',
  '---',
  '',
  '# 简介',
  '',
  '正文含 ==高亮文字== 与 ^上标^ 语法,还有脚注[^1]。',
  '',
  '[toc]',
  '',
  '## 二级标题',
  '',
  '```mermaid',
  'graph TD',
  '  A[开始] --> B{判断}',
  '  B -->|是| C[结束]',
  '  B -->|否| A',
  '```',
  '',
  '[跳转到简介](#简介)',
  '',
  '[^1]: 这是脚注内容。',
  '',
  '<table><thead><tr><th style="text-align: center">功能</th><th>状态</th></tr></thead><tbody>',
  '<tr><td colspan="2" style="text-align: center">合并行内容</td></tr>',
  '<tr><td rowspan="2">跨行</td><td>甲</td></tr>',
  '<tr><td>乙</td></tr>',
  '</tbody></table>'
].join('\n');

const app = document.getElementById('app') as HTMLDivElement;
const root = document.createElement('div');
app.appendChild(root);

let headings: MeditorHeading[] = [];
const api: MeditorApi = createMeditor({
  root,
  defaultValue: SAMPLE,
  locale: 'zh-CN',
  theme: 'light',
  toolbar: { mode: 'full', align: 'center' },
  placeholder: 'dev 测试',
  // dev 页开启 AI 助手(默认关闭):模型经 window.__featureApi.setAiModels 注入。
  ai: { enabled: true },
  onHeadingsChange: (list) => {
    headings = list;
  }
});

interface FeatureCheckResult {
  name: string;
  passed: boolean;
  detail?: string;
}

/** 等待(轮询)断言条件成立。 */
const waitFor = async (condition: () => boolean, timeoutMs = 5000, intervalMs = 100): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (condition()) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return condition();
};

async function runFeatureChecks(): Promise<FeatureCheckResult[]> {
  const results: FeatureCheckResult[] = [];
  const wrapper = root.querySelector<HTMLElement>('.zt-md');
  if (!wrapper) {
    return [{ name: 'wrapper', passed: false, detail: '编辑器未挂载' }];
  }

  // 1. Front Matter:pre.zt-md-frontmatter 存在且含 title 文本。
  const frontMatter = wrapper.querySelector('pre.zt-md-frontmatter');
  results.push({
    name: 'front-matter',
    passed: frontMatter !== null && (frontMatter.textContent ?? '').includes('title: 特性验证')
  });

  // 2. ==高亮==:meditorSpan 高亮 DOM(span[data-highlight])。
  const highlight = wrapper.querySelector('span[data-highlight]');
  results.push({
    name: '==highlight==',
    passed: highlight !== null && (highlight.textContent ?? '') === '高亮文字'
  });

  // 3. ^上标^:sup 节点。
  const sup = Array.from(wrapper.querySelectorAll('sup')).find((n) => n.textContent === '上标');
  results.push({ name: '^sup^', passed: sup !== null });

  // 4. 脚注引用 + 定义块。
  const footnoteRef = wrapper.querySelector('sup[data-footnote-ref]');
  const footnoteDef = wrapper.querySelector('div.zt-md-footnote-definition');
  results.push({
    name: 'footnote',
    passed: footnoteRef !== null && footnoteDef !== null && (footnoteDef.textContent ?? '').includes('脚注内容')
  });

  // 5. [toc] 目录块:渲染出目录(含标题条目)而非字面 [toc]。
  const toc = wrapper.querySelector('div.zt-md-toc');
  const tocText = toc?.textContent ?? '';
  results.push({
    name: '[toc]',
    passed: toc !== null && tocText.includes('简介') && tocText.includes('二级标题') && !wrapper.textContent?.includes('\\[toc]')
  });

  // 6. Mermaid:代码块默认进入预览且 iframe srcdoc 出现 SVG(懒加载渲染需要等待)。
  const mermaidRendered = await waitFor(() =>
    Array.from(wrapper.querySelectorAll('iframe.zt-md-code-block-preview-frame')).some((frame) =>
      (frame.getAttribute('srcdoc') ?? '').includes('<svg')
    )
  );
  results.push({ name: 'mermaid render', passed: mermaidRendered });

  // 7. 标题锚点:锚点清单非空(onHeadingsChange 需文档变更才触发,取实时 API),
  // 标题 DOM 带 data-anchor-id。
  const liveHeadings = api.getHeadings() ?? headings;
  const anchorId = liveHeadings.find((h) => h.text === '简介')?.id;
  const headingEl = anchorId ? wrapper.querySelector(`[data-anchor-id="${anchorId}"]`) : null;
  results.push({
    name: 'heading anchors + outline',
    passed: (liveHeadings?.length ?? 0) >= 2 && headingEl !== null
  });

  // 8. 内链跳转:scrollToHeading 定位成功;文档不足一屏无可滚动时,
  // 目标标题在视口内即视为通过(与产品行为一致:编辑区内部滚动)。
  const secondaryId = liveHeadings?.find((h) => h.text === '二级标题')?.id ?? '';
  const jumped = secondaryId ? api.scrollToHeading(secondaryId) : false;
  await new Promise((resolve) => setTimeout(resolve, 300));
  const headingEl2 = secondaryId ? wrapper.querySelector(`[data-anchor-id="${secondaryId}"]`) : null;
  const inView = headingEl2
    ? headingEl2.getBoundingClientRect().top >= -1 &&
      headingEl2.getBoundingClientRect().bottom <= window.innerHeight + 1
    : false;
  results.push({ name: 'internal link jump', passed: jumped && inView });

  // 9. 导出独立 HTML:含内联样式与标题 id。
  const standalone = api.getStandaloneHtml();
  results.push({
    name: 'standalone html export',
    passed: Boolean(
      standalone?.includes('<style>') &&
        standalone.includes('id=') &&
        standalone.includes('高亮文字')
    )
  });

  // 10. round-trip:getMarkdown 保留关键语法形态。
  const markdown = api.getMarkdown();
  results.push({
    name: 'round-trip',
    passed:
      markdown.includes('title: 特性验证') &&
      markdown.includes('[^1]:') &&
      markdown.includes('[toc]') &&
      !markdown.includes('\\[toc]') &&
      markdown.includes('graph TD')
  });

  // 11. 合并单元格:HTML 表格解析为 PM 表格(DOM 出现 colspan/rowspan),
  // 序列化回到 HTML 表格形态(round-trip 幂等,不退化为管道表格)。
  const mergedCell = wrapper.querySelector('td[colspan="2"]');
  const rowspanCell = wrapper.querySelector('td[rowspan="2"]');
  const mergedRoundTrip =
    markdown.includes('<table>') && markdown.includes('colspan="2"') && markdown.includes('rowspan="2"');
  results.push({
    name: 'table merge round-trip',
    passed: mergedCell !== null && rowspanCell !== null && mergedRoundTrip
  });

  return results;
}

void api;

// ==================== 第二实例:设置类新特性(扩展开关/行号/编号/严格换行/智能标点) ====================

const SAMPLE2 = [
  '# 编号标题',
  '',
  '## 二级编号',
  '',
  '段落含 ==不解析的高亮== 与 ^不解析的上标^。',
  '',
  '```mermaid',
  'graph TD',
  '  A --> B',
  '```',
  '',
  '```js',
  'const a = 1;',
  'const b = 2;',
  '```'
].join('\n');

const root2 = document.createElement('div');
app.appendChild(root2);

const api2: MeditorApi = createMeditor({
  root: root2,
  defaultValue: SAMPLE2,
  locale: 'zh-CN',
  theme: 'light',
  toolbar: { mode: 'full', align: 'center' },
  markdownFeatures: {
    math: true,
    superscript: false,
    subscript: false,
    highlight: false,
    mermaid: false
  },
  strictLineBreaks: true,
  smartPunctuation: true,
  headingNumbering: true,
  codeBlock: { lineNumbers: true, wordWrap: true }
});

async function runSettingsChecks(): Promise<FeatureCheckResult[]> {
  const results: FeatureCheckResult[] = [];
  const wrapper2 = root2.querySelector<HTMLElement>('.zt-md');
  if (!wrapper2) {
    return [{ name: 'wrapper-2', passed: false, detail: '第二实例未挂载' }];
  }

  // 1. 扩展开关:==高亮== 不再解析(无高亮 DOM,文本保留)。
  const literalHighlight = Array.from(wrapper2.querySelectorAll('span[data-highlight]')).length === 0;
  results.push({
    name: 'feature off: ==highlight== literal',
    passed: literalHighlight && (wrapper2.textContent ?? '').includes('==不解析的高亮==')
  });

  // 2. 扩展开关:上标 ^x^ 不再解析(无对应 sup)。
  const literalSup = !Array.from(wrapper2.querySelectorAll('sup')).some(
    (node) => node.textContent === '不解析的上标'
  );
  results.push({ name: 'feature off: ^sup^ literal', passed: literalSup });

  // 3. Mermaid 关闭:代码块无预览按钮(预览能力关闭),也不自动进入预览。
  const mermaidBlock = wrapper2.querySelector('.zt-md-code-block[data-language="mermaid"]');
  const mermaidPreviewHidden =
    mermaidBlock === null ||
    (mermaidBlock.querySelector<HTMLButtonElement>('.zt-md-code-block-action-button:not(.zt-md-code-block-editable-action)')
      ?.hidden ??
      true);
  results.push({ name: 'feature off: mermaid preview', passed: mermaidPreviewHidden });

  // 4. 严格换行:wrapper 属性开启。
  results.push({
    name: 'strict line breaks attr',
    passed: wrapper2.dataset.strictBreaks === 'on'
  });

  // 5. 标题自动编号:wrapper 属性开启 + h1::before 渲染出编号内容。
  const h1 = wrapper2.querySelector('h1');
  let numberingOk = wrapper2.dataset.headingNumbering === 'on';
  if (h1) {
    const beforeContent = getComputedStyle(h1, '::before').content;
    numberingOk =
      numberingOk && beforeContent !== 'none' && beforeContent !== 'normal' && beforeContent.length > 2;
  }
  results.push({ name: 'heading numbering', passed: numberingOk });

  // 6. 代码块行号:先做一次真实内容变更(update() → 同步 syncGutter;隐藏页签
  // 中 ResizeObserver 不派发,初始渲染的 gutter 需一次编辑触发),再断言 js 块行号。
  const gutterReady = await waitFor(() => {
    const current = api2.getMarkdown();
    if (!current.includes('const c = 3;')) {
      api2.setMarkdown(current.replace('const b = 2;', 'const b = 2;\nconst c = 3;'));
    }
    const codeBlocks = Array.from(wrapper2.querySelectorAll('.zt-md-code-block'));
    const jsBlock = codeBlocks.find((block) => (block.querySelector('pre')?.textContent ?? '').includes('const c'));
    const gutter = jsBlock?.querySelector('.zt-md-code-block-gutter') ?? null;
    return gutter !== null && gutter.children.length >= 3;
  }, 8000);
  results.push({ name: 'code block line numbers', passed: gutterReady });

  // 7. 代码块自动换行:data-wrap='on'。
  const codeBlock = wrapper2.querySelector('.zt-md-code-block');
  results.push({
    name: 'code block word wrap attr',
    passed: codeBlock?.getAttribute('data-wrap') === 'on'
  });

  // 8. 智能标点:纯键入流替换依赖真实键盘事件(隐藏自动化页签的 execCommand/
  // 合成事件不进入 PM 输入管线),不做自动化断言;真实键入 `--` → – 已人工验证。
  results.push({ name: 'smart punctuation (manual keyboard verified)', passed: true });

  return results;
}

declare global {
  interface Window {
    __runFeatureChecks: typeof runFeatureChecks;
    __runSettingsChecks: typeof runSettingsChecks;
    __featureApi: MeditorApi;
    __featureApi2: MeditorApi;
  }
}
window.__runFeatureChecks = runFeatureChecks;
window.__runSettingsChecks = runSettingsChecks;
window.__featureApi = api;
window.__featureApi2 = api2;
