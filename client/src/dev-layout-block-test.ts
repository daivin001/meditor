/**
 * dev-layout-block-test.ts — 布局块(meditor-layout)功能的手工/自动化验证页(仅 dev 使用)
 *
 * 预置覆盖三类能力的文档:① meditor-layout JSON 指令块(位置/文档作用域宽度、
 * heading 绑定、hidden、align、非法 JSON 容错);② meditor-layout:html 沙箱展示卡
 * (含应被禁执行的 script 标记);③ meditor-layout:js 沙箱执行卡(脚本渲染 +
 * postMessage 高度桥)。浏览器访问 /dev-layout-block-test.html 后在控制台跑
 * `await window.__runLayoutBlockChecks()`。
 * 不参与生产构建。
 */
import '@meditor/editor/style.css';
import { createMeditor, listMeditorLayoutBlocks, stripMeditorLayoutBlocks } from '@meditor/editor';

// 主样例:宽度指令块 / html 沙箱卡(禁执行脚本标记)/ js 执行卡(渲染 + resize 桥)/
// 非法 JSON 块 / 嵌套围栏块。
const SAMPLE = [
  '# 布局块验证文档',
  '',
  '```meditor-layout',
  '{ "version": 1, "width": "wide" }',
  '```',
  '',
  '正文第一段。',
  '',
  '正文第二段。',
  '',
  '```meditor-layout:html hero',
  '<section class="hero">',
  '  <h1>产品发布</h1>',
  '  <p>全新版本正式上线</p>',
  '</section>',
  '<style>.hero{font-family:sans-serif;background:#eef3ff;padding:24px;border-radius:12px}.hero h1{margin:0 0 8px;color:#1f4fd8}</style>',
  '<script>window.__mlRan = 1</script>',
  '```',
  '',
  '```meditor-layout:js kpi',
  "document.getElementById('app').innerHTML = '<div class=\"kpi\">✅ JS 卡渲染成功</div>';",
  'meditorLayout.resize(140);',
  '```',
  '',
  '```meditor-layout',
  '{ 这不是合法 JSON',
  '```',
  '',
  '正文第三段。',
  '',
  '````meditor-layout',
  '内部含普通围栏:',
  '```js',
  'console.log(1)',
  '```',
  '````',
  '',
  '结尾段落。'
].join('\n');

// 文档作用域场景:全文 narrow + 自定义 class(校验 wrapper 属性与类)。
const DOCUMENT_SCOPE_SAMPLE = [
  '```meditor-layout',
  '{ "scope": "document", "width": "narrow", "class": "hero" }',
  '```',
  '',
  '全文段落。'
].join('\n');

// 标题绑定场景:narrow + center 绑定到「目标章节」(至下一同级-or-higher 标题)。
const HEADING_SAMPLE = [
  '引言段落。',
  '',
  '```meditor-layout',
  '{ "heading": "目标章节", "width": "narrow", "align": "center" }',
  '```',
  '',
  '## 目标章节',
  '',
  '章节第一段。',
  '',
  '章节第二段。',
  '',
  '## 下一章',
  '',
  '后续段落。'
].join('\n');

// 隐藏指令场景:正常模式隐藏、布局模式可见(便于定位修复)。
const HIDDEN_SAMPLE = [
  '可见段落。',
  '',
  '```meditor-layout',
  '{ "hidden": true }',
  '```',
  '',
  '被隐藏段落。'
].join('\n');

const host = document.getElementById('app');
if (host) {
  const api = createMeditor({
    root: host,
    defaultValue: SAMPLE,
    locale: 'zh-CN',
    theme: 'light',
    toolbar: { mode: 'full', align: 'center' }
  });

  interface LayoutBlockCheckWindow {
    __meditorApi: typeof api;
    __layoutSample: string;
    __runLayoutBlockChecks: () => Promise<Record<string, unknown>>;
  }

  const target = window as unknown as LayoutBlockCheckWindow;
  target.__meditorApi = api;
  target.__layoutSample = SAMPLE;

  // 自动化断言:控制台调用 await __runLayoutBlockChecks() 返回逐项结果。
  target.__runLayoutBlockChecks = async (): Promise<Record<string, unknown>> => {
    const results: Record<string, unknown> = {};
    // 等待余量:attr 写回(300ms 防抖)+ markdown 重序列化(150ms 防抖)+
    // 后台标签页定时器节流(实测可拖到 1s+)。
    const settle = (ms = 2200): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
    const wrapper = (): HTMLElement => document.querySelector('.meditor-wrapper') as HTMLElement;
    const blockEls = (): HTMLElement[] =>
      Array.from(document.querySelectorAll('.zt-md .zt-md-layout-block'));
    const renderCards = (): HTMLElement[] =>
      Array.from(document.querySelectorAll('.zt-md .zt-md-layout-block[data-view="render"]'));
    const paraByText = (text: string): HTMLElement | null =>
      (Array.from(document.querySelectorAll('.ProseMirror > p')).find(
        (el) => el.textContent === text
      ) as HTMLElement | undefined) ?? null;

    api.setMarkdown(SAMPLE);
    api.setLayoutMode(false);
    await settle();

    results.parsedBlockCount = listMeditorLayoutBlocks(SAMPLE).length;

    // 1. round-trip:setMarkdown → getMarkdown 应逐字还原。
    const roundTrip = api.getMarkdown();
    results.roundTripIdentical = roundTrip === SAMPLE;
    results.roundTripDiffSample = roundTrip === SAMPLE ? null : { expected: SAMPLE, actual: roundTrip };

    // 2. LLM 导出:剥离后不含布局块标记,正文段落逐字保留。
    const forLlm = api.getMarkdownForLLM();
    results.stripRemovedFences = !forLlm.includes('meditor-layout');
    results.stripKeepsParagraphs = ['正文第一段。', '正文第二段。', '结尾段落。'].every((line) =>
      forLlm.includes(line)
    );
    results.stripMatchesPureUtil = forLlm === stripMeditorLayoutBlocks(SAMPLE);

    // 3. 位置指令效果:其后块带宽度 class;非法 JSON 块无效果且不中断作用域。
    results.documentWidthAttr = wrapper().getAttribute('data-ml-width');
    results.directiveAppliesWide = Boolean(
      paraByText('正文第一段。')?.classList.contains('zt-md-ml-w-wide')
    );
    results.scopeSurvivesInvalidJson = Boolean(
      paraByText('正文第三段。')?.classList.contains('zt-md-ml-w-wide')
    );

    // 4. 模式显隐(正常模式):指令块/非法块/嵌套围栏块隐藏,html 卡 + js 卡可见。
    results.normalModeVisibility = (() => {
      const hiddenSources = blockEls().filter((el) => el.dataset.view !== 'render');
      return {
        renderCardCount: renderCards().length,
        sourceBlocksHidden:
          hiddenSources.length > 0 &&
          hiddenSources.every((el) => getComputedStyle(el).display === 'none'),
      };
    })();

    // 5. html 卡:iframe 高度自适应、脚本被沙箱禁执行。
    await settle(600);
    results.htmlCard = (() => {
      const frame = renderCards()[0]?.querySelector('iframe') as HTMLIFrameElement | null;
      let scriptBlocked: boolean | null = null;
      try {
        const childView = frame?.contentWindow as (Window & { __mlRan?: number }) | null;
        scriptBlocked = childView !== null && childView.__mlRan === undefined;
      } catch {
        scriptBlocked = null;
      }
      return {
        iframeHeightSet: Boolean(frame && Number.parseFloat(frame.style.height) > 0),
        scriptBlocked,
      };
    })();

    // 6. js 卡:allow-scripts(且无 allow-same-origin)沙箱执行,渲染 + resize
    //    消息桥生效(高度被脚本上调到 140,高于 64 下限即为桥通证)。
    results.jsCard = (() => {
      const card = renderCards().find(
        (el) => el.querySelector('iframe')?.getAttribute('sandbox') === 'allow-scripts'
      );
      const frame = card?.querySelector('iframe') as HTMLIFrameElement | null;
      return {
        sandboxAllowScriptsOnly:
          frame !== null && !frame.getAttribute('sandbox')?.includes('allow-same-origin'),
        bridgeHeightApplied:
          Boolean(frame) && Number.parseFloat(frame?.style.height ?? '0') >= 140,
      };
    })();

    // 7. 布局模式:全部块显示源码面板,文档级属性维持未设。
    api.setLayoutMode(true);
    await settle();
    results.layoutMode = (() => {
      const views = blockEls().map((el) => el.dataset.view ?? 'source');
      return {
        allSource: views.every((v) => v !== 'render'),
        blockCount: blockEls().length,
        widthAttrUnset: wrapper().getAttribute('data-ml-width') === null,
      };
    })();

    // 8. 删除保护:正常模式点删除按钮 → 拦截;布局模式 → 放行。
    const clickFirstDelete = (): void => {
      document.querySelector<HTMLButtonElement>('.zt-md-layout-block-delete')?.click();
    };
    api.setLayoutMode(false);
    clickFirstDelete();
    await settle();
    results.guardBlocksNormalMode = api.getMarkdown().includes('meditor-layout');
    api.setLayoutMode(true);
    clickFirstDelete();
    await settle();
    // 用首块(宽度指令)独有内容判断删除生效;排除后续非法 JSON 块的干扰。
    results.layoutModeAllowsDelete = !api.getMarkdown().includes('"width": "wide"');

    // 9. 文档作用域场景:全文 narrow + 自定义 class(只走 wrapper)。
    api.setMarkdown(DOCUMENT_SCOPE_SAMPLE);
    await settle();
    results.documentScope = (() => {
      const para = paraByText('全文段落。');
      return {
        widthAttr: wrapper().getAttribute('data-ml-width') === 'narrow',
        wrapperClass: wrapper().classList.contains('zt-md-ml-c-hero'),
        blockWidthClassAbsent: !para?.classList.contains('zt-md-ml-w-narrow'),
      };
    })();

    // 10. 标题绑定场景:章节内块带 narrow + center,章节外块不受影响。
    api.setMarkdown(HEADING_SAMPLE);
    await settle();
    results.headingBinding = (() => {
      const inSection = (text: string): boolean => {
        const el = paraByText(text) ?? Array.from(document.querySelectorAll('.ProseMirror > h2')).find(
          (h) => h.textContent === text
        ) ?? null;
        return Boolean(
          el?.classList.contains('zt-md-ml-w-narrow') && el.classList.contains('zt-md-ml-align-center')
        );
      };
      return {
        headingApplied: inSection('目标章节'),
        para1Applied: inSection('章节第一段。'),
        para2Applied: inSection('章节第二段。'),
        beforeUntouched: !(paraByText('引言段落。')?.classList.contains('zt-md-ml-w-narrow') ?? true),
        afterUntouched: !(paraByText('后续段落。')?.classList.contains('zt-md-ml-w-narrow') ?? true),
      };
    })();

    // 11. 隐藏指令:正常模式 display none;布局模式可见以便定位修复。
    api.setMarkdown(HIDDEN_SAMPLE);
    api.setLayoutMode(false);
    await settle();
    const hiddenPara = (): HTMLElement | null => paraByText('被隐藏段落。');
    const normalHidden = getComputedStyle(hiddenPara()!).display === 'none';
    api.setLayoutMode(true);
    await settle();
    const layoutVisible = getComputedStyle(hiddenPara()!).display !== 'none';
    api.setLayoutMode(false);
    await settle();
    const normalHiddenAgain = getComputedStyle(hiddenPara()!).display === 'none';
    results.hiddenDirective = {
      normalModeHidden: normalHidden,
      layoutModeVisible: layoutVisible,
      normalModeHiddenAgain: normalHiddenAgain,
    };

    // 还原初始样例文档供后续手工检查。
    api.setMarkdown(SAMPLE);
    api.setLayoutMode(true);
    return results;
  };
}
