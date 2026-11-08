/**
 * src/settings.ts — 设置面板
 *
 * 分区面板集中管理壳层偏好(对齐 Typora 偏好设置的信息架构):
 * 通用(语言/主题/自定义主题/版式)、编辑器(字体/字号/行距/缩放/专注/打字机/
 * 自动配对/Emoji 补全/拼写检查/智能标点/严格换行/标题编号/大纲深度)、
 * 图片(插入策略/PicGo/自定义上传命令/测试)、Markdown 扩展开关、
 * 代码块(行号/换行)、文件(自动保存)、打印页边距、自定义 CSS。
 * 全部偏好持久化 localStorage;需要重建编辑器或刷新静态文案的项经回调交还
 * main 编排。
 */
import { getLocale, setLocale, t, type UiLocale } from './i18n';
import type { ImageStrategy } from './image-strategy';
import type { AiModelConfig } from '@meditor/editor';

/** 壳层偏好(与 main.ts 的持久化键共用约定)。 */
export interface ShellPrefs {
  dark: boolean;
  layout: 'full' | 'wide';
  focusMode: boolean;
  typewriterMode: boolean;
  autoPair: boolean;
  emojiAutocomplete: boolean;
  spellcheck: boolean;
  customCss: string;
  /** 图片插入策略(默认内嵌)。 */
  imageStrategy: ImageStrategy;
  /** PicGo server 地址。 */
  picgoUrl: string;
  /** 自定义上传命令模板(优先于 PicGo)。 */
  uploadCommand: string;
  /** 自动保存到磁盘。 */
  autoSave: boolean;
  /** 自动保存间隔(秒)。 */
  autoSaveInterval: number;
  /** 正文字体(空 = 默认)。 */
  fontFamily: string;
  /** 正文字号(px)。 */
  contentFontSize: number;
  /** 行距。 */
  lineHeight: number;
  /** 视图缩放(百分比,Ctrl+滚轮/快捷键调节)。 */
  zoom: number;
  /** Markdown 扩展开关。 */
  featMath: boolean;
  featSuperscript: boolean;
  featSubscript: boolean;
  featHighlight: boolean;
  featMermaid: boolean;
  /** 严格换行(GFM)。 */
  strictBreaks: boolean;
  /** 智能标点。 */
  smartPunct: boolean;
  /** 标题自动编号。 */
  headingNumbering: boolean;
  /** AI 模型清单(OpenAI 兼容;AI 助手面板选择使用)。 */
  aiModels: AiModelConfig[];
  /** 代码块行号。 */
  codeLineNumbers: boolean;
  /** 代码块自动换行。 */
  codeWordWrap: boolean;
  /** 拼写检查语言(空 = 跟随系统)。 */
  spellcheckLang: string;
  /** 打印页边距。 */
  printMargin: 'default' | 'narrow' | 'wide' | 'none';
  /** 自定义主题文件名(空 = 内置明暗)。 */
  customTheme: string;
}

/** 设置面板回调(main 编排层注入)。 */
export interface SettingsCallbacks {
  /** 任意偏好变更(含即时生效项)。 */
  onPrefsChange: (prefs: ShellPrefs, changed: keyof ShellPrefs) => void;
  /** 语言切换(需刷新静态文案并重建编辑器)。 */
  onLocaleChange: (locale: UiLocale) => void;
  /** 测试图床上传(返回 URL;失败 reject)。 */
  onTestUpload: () => Promise<string>;
  /** 打开主题文件夹。 */
  onOpenThemesFolder: () => void;
  /** 自定义主题文件清单(面板打开/刷新时读取)。 */
  getThemeFiles: () => string[];
}

/** 面板是否已打开。 */
let isOpen = false;

/** Esc 关闭监听是否已注册(面板懒创建时注册一次)。 */
let escListenerRegistered = false;

/** 构建设置面板 DOM(懒创建,常驻复用)。标准对话框结构:顶部 Header(标题 +
 * 关闭按钮)/ 中部可滚动内容区 / 底部按钮栏;Esc 或点击遮罩亦可关闭。 */
function ensurePanel(
  callbacks: SettingsCallbacks,
  getPrefs: () => ShellPrefs
): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.className = 'settings-overlay';
  overlay.hidden = true;

  const panel = document.createElement('div');
  panel.className = 'settings-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', t('settingsTitle'));

  // --- 顶部 Header:标题 + 关闭按钮 ---
  const header = document.createElement('div');
  header.className = 'settings-dialog-header';
  const title = document.createElement('span');
  title.className = 'settings-dialog-title';
  title.setAttribute('data-settings-i18n', 'settingsTitle');
  title.textContent = t('settingsTitle');
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'settings-dialog-close';
  closeButton.setAttribute('aria-label', t('settingsDialogClose'));
  closeButton.title = t('settingsDialogClose');
  closeButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  closeButton.addEventListener('click', () => closeSettings());
  header.append(title, closeButton);

  // --- 中部内容区(可滚动;全部偏好行挂这里) ---
  const body = document.createElement('div');
  body.className = 'settings-dialog-body';

  /** 行构造:标签 + 控件区。 */
  const buildRow = (labelText: string, control: HTMLElement): HTMLDivElement => {
    const row = document.createElement('div');
    row.className = 'settings-row';
    const label = document.createElement('span');
    label.className = 'settings-label';
    label.textContent = labelText;
    row.append(label, control);
    return row;
  };

  /** 分区标题。 */
  const buildSection = (titleText: string): HTMLDivElement => {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.textContent = titleText;
    return section;
  };

  /** 开关构造(checkbox + 滑块外观)。 */
  const buildToggle = (key: keyof ShellPrefs): HTMLLabelElement => {
    const wrap = document.createElement('label');
    wrap.className = 'settings-toggle';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(getPrefs()[key]);
    input.addEventListener('change', () => {
      callbacks.onPrefsChange({ ...getPrefs(), [key]: input.checked }, key);
    });
    const slider = document.createElement('span');
    slider.className = 'settings-toggle-slider';
    wrap.append(input, slider);
    // 面板打开时同步当前值。
    overlay.addEventListener('settings:refresh', (() => {
      input.checked = Boolean(getPrefs()[key]);
    }) as EventListener);
    return wrap;
  };

  /** 分段选择构造(单选按钮组)。 */
  const buildSegment = <T extends string>(
    options: { value: T; label: () => string }[],
    current: () => T,
    onPick: (value: T) => void
  ): HTMLDivElement => {
    const group = document.createElement('div');
    group.className = 'settings-segment';
    const buttons = options.map((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'settings-segment-item';
      button.textContent = option.label();
      button.dataset.active = option.value === current() ? 'true' : 'false';
      button.addEventListener('click', () => {
        onPick(option.value);
        buttons.forEach((b) => (b.dataset.active = 'false'));
        button.dataset.active = 'true';
      });
      overlay.addEventListener('settings:refresh', (() => {
        button.dataset.active = option.value === current() ? 'true' : 'false';
      }) as EventListener);
      group.appendChild(button);
      return button;
    });
    return group;
  };

  /** 下拉选择构造。 */
  const buildSelect = <T extends string>(
    options: { value: T; label: () => string }[],
    current: () => T,
    onPick: (value: T) => void
  ): HTMLSelectElement => {
    const select = document.createElement('select');
    select.className = 'settings-select';
    const sync = (): void => {
      const value = current();
      select.replaceChildren(
        ...options.map((option) => {
          const item = document.createElement('option');
          item.value = option.value;
          item.textContent = option.label();
          item.selected = option.value === value;
          return item;
        })
      );
    };
    select.addEventListener('change', () => {
      onPick(select.value as T);
    });
    sync();
    overlay.addEventListener('settings:refresh', sync as EventListener);
    return select;
  };

  /** 文本输入构造(防抖提交)。 */
  const buildText = (
    key: keyof ShellPrefs,
    placeholder: string,
    debounceMs = 400
  ): HTMLInputElement => {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'settings-input';
    input.placeholder = placeholder;
    input.value = String(getPrefs()[key] ?? '');
    let timer: ReturnType<typeof setTimeout> | undefined;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        callbacks.onPrefsChange({ ...getPrefs(), [key]: input.value }, key);
      }, debounceMs);
    });
    overlay.addEventListener('settings:refresh', (() => {
      input.value = String(getPrefs()[key] ?? '');
    }) as EventListener);
    return input;
  };

  /** 普通按钮。 */
  const buildButton = (labelText: string, onClick: () => void): HTMLButtonElement => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'settings-button';
    button.textContent = labelText;
    button.addEventListener('click', onClick);
    return button;
  };

  /** AI 模型配置卡内文本输入(防抖提交到模型对象)。 */
  const buildAiField = (
    labelText: string,
    value: string,
    onInput: (value: string) => void
  ): HTMLLabelElement => {
    const wrap = document.createElement('label');
    wrap.className = 'settings-ai-field';
    const label = document.createElement('span');
    label.className = 'settings-ai-field-label';
    label.textContent = labelText;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'settings-input';
    input.value = value;
    input.autocomplete = 'off';
    input.spellcheck = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => onInput(input.value), 400);
    });
    wrap.append(label, input);
    return wrap;
  };

  /** 单个 AI 模型配置卡(名称/接口地址/API Key/模型 ID + 删除)。 */
  const buildAiModelCard = (
    model: AiModelConfig,
    onChange: (next: AiModelConfig) => void,
    onDelete: () => void
  ): HTMLElement => {
    const card = document.createElement('div');
    card.className = 'settings-ai-card';
    card.append(
      buildAiField(t('settingsAiName'), model.name, (value) => onChange({ ...model, name: value })),
      buildAiField(t('settingsAiBaseUrl'), model.baseUrl, (value) =>
        onChange({ ...model, baseUrl: value.trim() })
      ),
      buildAiField(t('settingsAiApiKey'), model.apiKey, (value) =>
        onChange({ ...model, apiKey: value.trim() })
      ),
      buildAiField(t('settingsAiModelId'), model.model, (value) =>
        onChange({ ...model, model: value.trim() })
      )
    );
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'settings-ai-delete';
    deleteButton.title = t('settingsAiDelete');
    deleteButton.setAttribute('aria-label', t('settingsAiDelete'));
    deleteButton.textContent = '✕';
    deleteButton.addEventListener('click', onDelete);
    card.appendChild(deleteButton);
    return card;
  };

  /** AI 模型清单编辑区(卡片列表 + 添加按钮;设置变更经 onPrefsChange 实时生效)。 */
  const buildAiModels = (): HTMLDivElement => {
    const wrap = document.createElement('div');
    wrap.className = 'settings-ai-list';

    const render = (): void => {
      wrap.replaceChildren();
      const models = getPrefs().aiModels;
      if (models.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'settings-ai-empty';
        empty.textContent = t('settingsAiEmpty');
        wrap.appendChild(empty);
      }
      models.forEach((model, index) => {
        wrap.appendChild(
          buildAiModelCard(
            model,
            (next) => {
              // 输入编辑不重渲染(保持焦点),值经防抖提交到偏好层。
              const nextModels = [...getPrefs().aiModels];
              nextModels[index] = next;
              callbacks.onPrefsChange({ ...getPrefs(), aiModels: nextModels }, 'aiModels');
            },
            () => {
              const nextModels = getPrefs().aiModels.filter((_, i) => i !== index);
              callbacks.onPrefsChange({ ...getPrefs(), aiModels: nextModels }, 'aiModels');
              render();
            }
          )
        );
      });
      const addRow = document.createElement('div');
      addRow.className = 'settings-ai-add-row';
      addRow.appendChild(
        buildButton(t('settingsAiAdd'), () => {
          const nextModels = [
            ...getPrefs().aiModels,
            { name: '', baseUrl: '', apiKey: '', model: '' },
          ];
          callbacks.onPrefsChange({ ...getPrefs(), aiModels: nextModels }, 'aiModels');
          render();
        })
      );
      wrap.appendChild(addRow);
    };

    render();
    // 面板每次打开重放当前清单。
    overlay.addEventListener('settings:refresh', render as EventListener);
    return wrap;
  };

  /** 数字调节行(− 值 ＋ / 重置),用于视图缩放。 */
  const buildStepper = (
    options: { step: number; min: number; max: number; reset: number; suffix: string }
  ): HTMLDivElement => {
    const wrap = document.createElement('div');
    wrap.className = 'settings-stepper';
    const value = document.createElement('span');
    value.className = 'settings-stepper-value';
    const sync = (): void => {
      value.textContent = `${Math.round(getPrefs().zoom)}${options.suffix}`;
    };
    const adjust = (delta: number): void => {
      const next = Math.min(options.max, Math.max(options.min, Math.round((getPrefs().zoom + delta) / options.step) * options.step));
      if (next !== getPrefs().zoom) {
        callbacks.onPrefsChange({ ...getPrefs(), zoom: next }, 'zoom');
      }
    };
    const minus = buildButton('−', () => adjust(-options.step));
    const plus = buildButton('＋', () => adjust(options.step));
    const reset = buildButton(t('settingsZoomReset'), () => {
      callbacks.onPrefsChange({ ...getPrefs(), zoom: options.reset }, 'zoom');
    });
    wrap.append(minus, value, plus, reset);
    overlay.addEventListener('settings:refresh', sync as EventListener);
    sync();
    return wrap;
  };

  // ==================== 通用 ====================
  const languageRow = buildRow(
    t('settingsLanguage'),
    buildSegment<UiLocale>(
      [
        { value: 'zh-CN', label: () => t('settingsLanguageZh') },
        { value: 'en-US', label: () => t('settingsLanguageEn') }
      ],
      () => getLocale(),
      (locale) => callbacks.onLocaleChange(locale)
    )
  );
  languageRow.querySelector('.settings-label')?.setAttribute('data-settings-i18n', 'settingsLanguage');

  const themeFilesSelect = buildSelect<string>(
    [{ value: '', label: () => t('settingsCustomThemeNone') }],
    () => getPrefs().customTheme,
    (value) => callbacks.onPrefsChange({ ...getPrefs(), customTheme: value }, 'customTheme')
  );
  // 打开面板时重扫主题文件清单。
  overlay.addEventListener('settings:refresh', (() => {
    const files = callbacks.getThemeFiles();
    const current = getPrefs().customTheme;
    themeFilesSelect.replaceChildren(
      ...[
        { value: '', label: t('settingsCustomThemeNone') },
        ...files.map((file) => ({ value: file, label: file.replace(/\.css$/i, '') }))
      ].map((option) => {
        const item = document.createElement('option');
        item.value = option.value;
        item.textContent = option.label;
        item.selected = option.value === current;
        return item;
      })
    );
  }) as EventListener);

  body.append(
    buildSection(t('settingsSectionGeneral')),
    languageRow,
    buildRow(t('settingsTheme'), buildSegment<'light' | 'dark'>(
      [
        { value: 'light', label: () => t('settingsThemeLight') },
        { value: 'dark', label: () => t('settingsThemeDark') }
      ],
      () => (getPrefs().dark ? 'dark' : 'light'),
      (value) => callbacks.onPrefsChange({ ...getPrefs(), dark: value === 'dark' }, 'dark')
    )),
    buildRow(t('settingsCustomTheme'), themeFilesSelect),
    buildRow('', buildButton(t('settingsThemesFolder'), () => callbacks.onOpenThemesFolder())),
    buildRow(t('settingsLayout'), buildSegment<'full' | 'wide'>(
      [
        { value: 'full', label: () => t('settingsLayoutFull') },
        { value: 'wide', label: () => t('settingsLayoutWide') }
      ],
      () => getPrefs().layout,
      (value) => callbacks.onPrefsChange({ ...getPrefs(), layout: value }, 'layout')
    )),

    // ==================== 编辑器 ====================
    buildSection(t('settingsSectionEditor')),
    buildRow(t('settingsFont'), buildText('fontFamily', t('settingsFontPlaceholder'), 500)),
    buildRow(t('settingsFontSize'), buildSegment<string>(
      ['14', '15.5', '17', '19', '21'].map((size) => ({
        value: size,
        label: () => `${size}px`
      })),
      () => String(getPrefs().contentFontSize),
      (value) => callbacks.onPrefsChange({ ...getPrefs(), contentFontSize: Number(value) }, 'contentFontSize')
    )),
    buildRow(t('settingsLineHeight'), buildSegment<string>(
      ['1.5', '1.75', '2'].map((value) => ({ value, label: () => value })),
      () => String(getPrefs().lineHeight),
      (value) => callbacks.onPrefsChange({ ...getPrefs(), lineHeight: Number(value) }, 'lineHeight')
    )),
    buildRow(t('settingsZoom'), buildStepper({ step: 10, min: 60, max: 300, reset: 100, suffix: '%' })),
    buildRow(t('settingsFocus'), buildToggle('focusMode')),
    buildRow(t('settingsTypewriter'), buildToggle('typewriterMode')),
    buildRow(t('settingsAutoPair'), buildToggle('autoPair')),
    buildRow(t('settingsEmojiComplete'), buildToggle('emojiAutocomplete')),
    buildRow(t('settingsSpellcheck'), buildToggle('spellcheck')),
    buildRow(t('settingsSpellcheckLang'), buildSelect<string>(
      [
        { value: '', label: () => t('settingsSpellcheckLangAuto') },
        { value: 'zh-CN', label: () => '中文 (zh-CN)' },
        { value: 'zh-TW', label: () => '中文 (zh-TW)' },
        { value: 'en-US', label: () => 'English (US)' },
        { value: 'en-GB', label: () => 'English (UK)' },
        { value: 'fr', label: () => 'Français' },
        { value: 'de', label: () => 'Deutsch' },
        { value: 'es', label: () => 'Español' },
        { value: 'ja', label: () => '日本語' },
        { value: 'ko', label: () => '한국어' },
        { value: 'ru', label: () => 'Русский' },
        { value: 'pt', label: () => 'Português' }
      ],
      () => getPrefs().spellcheckLang,
      (value) => callbacks.onPrefsChange({ ...getPrefs(), spellcheckLang: value }, 'spellcheckLang')
    )),
    buildRow(t('settingsSmartPunct'), buildToggle('smartPunct')),
    buildRow(t('settingsStrictBreaks'), buildToggle('strictBreaks')),
    buildRow(t('settingsHeadingNumbering'), buildToggle('headingNumbering')),

    // ==================== AI 模型 ====================
    // 卡片式多模型配置(OpenAI 兼容):变更实时推送编辑器(AI 助手面板热更新)。
    buildSection(t('settingsSectionAi')),
    buildAiModels(),

    // ==================== 图片 ====================
    buildSection(t('settingsSectionImages')),
    buildRow(t('settingsImageStrategy'), buildSegment<ImageStrategy>(
      [
        { value: 'embed', label: () => t('settingsImageEmbed') },
        { value: 'assets', label: () => t('settingsImageAssets') },
        { value: 'upload', label: () => t('settingsImageUpload') }
      ],
      () => getPrefs().imageStrategy,
      (value) => callbacks.onPrefsChange({ ...getPrefs(), imageStrategy: value }, 'imageStrategy')
    )),
    (() => {
      const hint = document.createElement('div');
      hint.className = 'settings-hint-row';
      hint.textContent = t('settingsImageAssetsHint');
      return hint;
    })(),
    buildRow(t('settingsImageUploader'), buildSegment<'picgo' | 'command'>(
      [
        { value: 'picgo', label: () => 'PicGo Server' },
        { value: 'command', label: () => t('settingsImageUploadCommand') }
      ],
      () => (getPrefs().uploadCommand.trim() ? 'command' : 'picgo'),
      () => {
        /* 上传服务分段仅作展示切换;实际以上传命令是否填写为准 */
      }
    )),
    buildRow(t('settingsImagePicgoUrl'), buildText('picgoUrl', 'http://127.0.0.1:36677/upload', 500)),
    buildRow(t('settingsImageUploadCommand'), buildText('uploadCommand', t('settingsImageUploadCommandPlaceholder'), 500)),
    (() => {
      const row = document.createElement('div');
      row.className = 'settings-row settings-row-block';
      const testButton = buildButton(t('settingsImageTest'), () => {
        testButton.disabled = true;
        testStatus.textContent = t('settingsImageTesting');
        callbacks
          .onTestUpload()
          .then((url) => {
            testStatus.textContent = t('settingsImageTestOk', { url });
          })
          .catch((error: unknown) => {
            testStatus.textContent = t('settingsImageTestFailed', { error: String(error) });
          })
          .finally(() => {
            testButton.disabled = false;
          });
      });
      const testStatus = document.createElement('div');
      testStatus.className = 'settings-hint-row';
      row.append(testButton, testStatus);
      return row;
    })(),

    // ==================== Markdown 扩展 ====================
    buildSection(t('settingsSectionMarkdown')),
    buildRow(t('settingsFeatMath'), buildToggle('featMath')),
    buildRow(t('settingsFeatSup'), buildToggle('featSuperscript')),
    buildRow(t('settingsFeatSub'), buildToggle('featSubscript')),
    buildRow(t('settingsFeatHighlight'), buildToggle('featHighlight')),
    buildRow(t('settingsFeatMermaid'), buildToggle('featMermaid')),

    // ==================== 代码块 ====================
    buildSection(t('settingsSectionCodeBlock')),
    buildRow(t('settingsCodeLineNumbers'), buildToggle('codeLineNumbers')),
    buildRow(t('settingsCodeWordWrap'), buildToggle('codeWordWrap')),

    // ==================== 文件 ====================
    buildSection(t('settingsSectionFiles')),
    buildRow(t('settingsAutoSave'), buildToggle('autoSave')),
    buildRow(t('settingsAutoSaveInterval'), buildSegment<string>(
      [
        { value: '30', label: () => '30s' },
        { value: '60', label: () => '1min' },
        { value: '300', label: () => '5min' }
      ],
      () => String(getPrefs().autoSaveInterval),
      (value) => callbacks.onPrefsChange({ ...getPrefs(), autoSaveInterval: Number(value) }, 'autoSaveInterval')
    )),

    // ==================== 打印 ====================
    buildSection(t('settingsSectionExport')),
    buildRow(t('settingsPrintMargin'), buildSegment<string>(
      [
        { value: 'default', label: () => t('settingsPrintMarginDefault') },
        { value: 'narrow', label: () => t('settingsPrintMarginNarrow') },
        { value: 'wide', label: () => t('settingsPrintMarginWide') },
        { value: 'none', label: () => t('settingsPrintMarginNone') }
      ],
      () => getPrefs().printMargin,
      (value) => callbacks.onPrefsChange({ ...getPrefs(), printMargin: value as ShellPrefs['printMargin'] }, 'printMargin')
    )),

    // ==================== 自定义 CSS ====================
    (() => {
      const cssArea = document.createElement('textarea') as HTMLTextAreaElement;
      cssArea.className = 'settings-css-input';
      cssArea.rows = 5;
      cssArea.placeholder = t('settingsCustomCssPlaceholder');
      cssArea.value = getPrefs().customCss;
      let cssTimer: ReturnType<typeof setTimeout> | undefined;
      cssArea.addEventListener('input', () => {
        clearTimeout(cssTimer);
        cssTimer = setTimeout(() => {
          callbacks.onPrefsChange({ ...getPrefs(), customCss: cssArea.value }, 'customCss');
        }, 400);
      });
      overlay.addEventListener('settings:refresh', (() => {
        cssArea.value = getPrefs().customCss;
      }) as EventListener);
      const cssLabel = document.createElement('div');
      cssLabel.className = 'settings-label settings-label-block';
      cssLabel.textContent = t('settingsCustomCss');
      const cssRow = document.createElement('div');
      cssRow.className = 'settings-row settings-row-block';
      cssRow.append(cssLabel, cssArea);
      return cssRow;
    })(),

    // ==================== 底部提示 ====================
    (() => {
      const hint = document.createElement('div');
      hint.className = 'settings-hint';
      hint.textContent = t('settingsEditorRestartHint');
      return hint;
    })()
  );

  // --- 底部按钮栏:完成 ---
  const footer = document.createElement('div');
  footer.className = 'settings-dialog-footer';
  const doneButton = document.createElement('button');
  doneButton.type = 'button';
  doneButton.className = 'settings-close';
  doneButton.setAttribute('data-settings-i18n', 'settingsClose');
  doneButton.textContent = t('settingsClose');
  doneButton.addEventListener('click', () => closeSettings());
  footer.append(doneButton);

  panel.append(header, body, footer);
  overlay.appendChild(panel);
  // 点遮罩关闭。
  overlay.addEventListener('mousedown', (event) => {
    if (event.target === overlay) closeSettings();
  });
  // Esc 关闭(面板生命周期内注册一次)。
  if (!escListenerRegistered) {
    escListenerRegistered = true;
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen) {
        closeSettings();
      }
    });
  }
  document.body.appendChild(overlay);
  return overlay;
}

/** 面板实例(懒创建)。 */
let panelEl: HTMLDivElement | null = null;

/** 打开设置面板。 */
export function openSettings(
  callbacks: SettingsCallbacks,
  getPrefs: () => ShellPrefs
): void {
  if (!panelEl) {
    panelEl = ensurePanel(callbacks, getPrefs);
  }
  // 每次打开重放当前值(含语言标题)。
  panelEl.querySelector('[role="dialog"]')?.setAttribute('aria-label', t('settingsTitle'));
  panelEl.querySelectorAll<HTMLElement>('[data-settings-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.settingsI18n as string);
  });
  panelEl.querySelector<HTMLElement>('.settings-close')!.textContent = t('settingsClose');
  const headerClose = panelEl.querySelector<HTMLElement>('.settings-dialog-close');
  if (headerClose) {
    headerClose.setAttribute('aria-label', t('settingsDialogClose'));
    headerClose.title = t('settingsDialogClose');
  }
  panelEl.querySelector<HTMLElement>('.settings-hint')!.textContent = t('settingsEditorRestartHint');
  panelEl.querySelector<HTMLInputElement>('.settings-css-input')!.placeholder = t('settingsCustomCssPlaceholder');
  panelEl.dispatchEvent(new CustomEvent('settings:refresh'));
  panelEl.hidden = false;
  isOpen = true;
}

/** 关闭设置面板。 */
export function closeSettings(): void {
  if (panelEl) panelEl.hidden = true;
  isOpen = false;
}

/** 面板当前是否打开。 */
export function isSettingsOpen(): boolean {
  return isOpen;
}
