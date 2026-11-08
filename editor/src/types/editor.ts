/**
 * types/editor.ts — 编辑器类型定义
 *
 * 1:1 翻译自 zt-react-milkdown/src/types/editor.ts
 * - 去除 'react' 依赖:CSSProperties['maxHeight'] 改用本地 CSSMaxHeight 类型
 * - 去除 ReactNode,headerSlot 类型改为 unknown
 * - 其它字段、注释、文案完全保留
 */

/**
 * 字符串或数字,用于替代 React 的 CSSProperties['maxHeight'] 类型。
 */
export type CSSMaxHeight = string | number;

/**
 * 替代 React 的 ReactNode,只允许渲染 plain object/primitive,DOM 模式下不使用。
 * 调用方负责把它挂到 DOM(本框架不渲染 React 树)。
 */
export type HeaderSlotContent = unknown;

/** 定义编辑器支持的主题类型。 */
export type EditorTheme = 'light' | 'dark';

/** 定义编辑器支持的语言类型。 */
export type EditorLocale = 'zh-CN' | 'en-US';

/** 定义编辑器内置文案结构。 */
export interface EditorI18nMessages {
  /** 空内容占位提示。 */
  placeholder: string;
  /** 编辑器初始化失败提示。 */
  initError: string;
  /** 编辑器区域无障碍标签。 */
  editorAriaLabel: string;
  /** 搜索面板无障碍标签。 */
  searchPanelAriaLabel: string;
  /** 搜索输入占位文案。 */
  searchInputPlaceholder: string;
  /** 替换输入占位文案。 */
  searchReplaceInputPlaceholder: string;
  /** 上一项按钮无障碍标签。 */
  searchPreviousAriaLabel: string;
  /** 下一项按钮无障碍标签。 */
  searchNextAriaLabel: string;
  /** 关闭搜索按钮无障碍标签。 */
  searchCloseAriaLabel: string;
  /** 区分大小写选项文案。 */
  searchCaseSensitiveLabel: string;
  /** 全词匹配选项文案。 */
  searchWholeWordLabel: string;
  /** 正则表达式选项文案。 */
  searchRegexpLabel: string;
  /** 替换当前项按钮文案。 */
  searchReplaceLabel: string;
  /** 全部替换按钮文案。 */
  searchReplaceAllLabel: string;
  /** 无效正则表达式提示。 */
  searchInvalidRegexp: string;
  /** 公式块源码输入无障碍标签。 */
  mathBlockSourceAriaLabel: string;
  /** 公式块复制按钮无障碍标签。 */
  mathBlockCopyAriaLabel: string;
  /** 公式块删除按钮无障碍标签。 */
  mathBlockDeleteAriaLabel: string;
  /** 图片删除按钮无障碍标签。 */
  imageDeleteAriaLabel: string;
  /** 表格删除按钮无障碍标签。 */
  tableDeleteAriaLabel: string;
  /** 表格更多按钮无障碍标签。 */
  tableMoreAriaLabel: string;
  /** 表格列左对齐按钮无障碍标签。 */
  tableAlignLeftAriaLabel: string;
  /** 表格列居中按钮无障碍标签。 */
  tableAlignCenterAriaLabel: string;
  /** 表格列右对齐按钮无障碍标签。 */
  tableAlignRightAriaLabel: string;
  /** 表格上方插入行按钮文案。 */
  tableInsertRowAboveLabel: string;
  /** 表格下方插入行按钮文案。 */
  tableInsertRowBelowLabel: string;
  /** 表格左侧插入列按钮文案。 */
  tableInsertColumnLeftLabel: string;
  /** 表格右侧插入列按钮文案。 */
  tableInsertColumnRightLabel: string;
  /** 表格删除当前行按钮文案。 */
  tableDeleteRowLabel: string;
  /** 表格删除当前列按钮文案。 */
  tableDeleteColumnLabel: string;
  /** 表格合并单元格菜单文案。 */
  tableMergeCellsLabel: string;
  /** 表格拆分单元格菜单文案。 */
  tableSplitCellLabel: string;
  /** 公式渲染失败提示。 */
  mathRenderError: string;
  /** 图片上传弹窗标题。 */
  imageUploadDialogTitle: string;
  /** 图片文件拖拽区域提示。 */
  imageUploadDropLabel: string;
  /** 图片文件选择按钮文案。 */
  imageUploadPickFileLabel: string;
  /** 图片文件上传页签文案。 */
  imageUploadFileTab: string;
  /** 图片链接页签文案。 */
  imageUploadUrlTab: string;
  /** 图片链接输入框占位文案。 */
  imageUploadUrlPlaceholder: string;
  /** 图片链接插入按钮文案。 */
  imageUploadInsertUrlLabel: string;
  /** 图片插入确认按钮文案。 */
  imageUploadConfirmLabel: string;
  /** 图片替代文本输入框标签。 */
  imageUploadAltLabel: string;
  /** 图片替代文本输入框占位文案。 */
  imageUploadAltPlaceholder: string;
  /** 图片上传中提示。 */
  imageUploadUploadingLabel: string;
  /** 图片插入准备中提示。 */
  imageUploadInsertingLabel: string;
  /** 图片上传取消按钮文案。 */
  imageUploadCancelLabel: string;
  /** 图片加载失败提示。 */
  imageUploadLoadFailed: string;
  /** 图片重新选择提示。 */
  imageUploadReselectHint: string;
  /** 图片格式和大小提示。 */
  imageUploadSupportsAndMax: string;
  /** 文件过大错误提示。 */
  imageUploadFileTooLarge: string;
  /** 文件过大错误提示(带体积占位符)。 */
  imageUploadFileSizeExceeded: string;
  /** 非图片文件错误提示。 */
  imageUploadInvalidType: string;
  /** 上传失败错误提示。 */
  imageUploadFailed: string;
  /** 文件读取失败提示。 */
  imageUploadFileReadFailed: string;
  /** 图片链接格式错误提示。 */
  imageUploadInvalidUrl: string;
  /** 图片链接为空错误提示。 */
  imageUploadUrlRequired: string;
  /** 请选择图片或输入链接提示。 */
  imageUploadSelectOrEnterImage: string;
  /** 图片上传等待提示。 */
  imageUploadUploadingWait: string;
  /** 图片预览编辑弹窗标题。 */
  imagePreviewDialogTitle: string;
  /** 图片预览关闭按钮无障碍标签。 */
  imagePreviewCloseAriaLabel: string;
  /** 图片预览加载失败提示。 */
  imagePreviewLoadFailed: string;
  /** 跨域图片仅可预览提示。 */
  imagePreviewEditDisabledHint: string;
  /** 图片导出失败提示。 */
  imagePreviewExportFailed: string;
  /** 图片预览放大按钮无障碍标签。 */
  imagePreviewZoomInAriaLabel: string;
  /** 图片预览缩小按钮无障碍标签。 */
  imagePreviewZoomOutAriaLabel: string;
  /** 图片预览实际大小按钮无障碍标签。 */
  imagePreviewZoomActualAriaLabel: string;
  /** 图片预览适应窗口按钮无障碍标签。 */
  imagePreviewZoomFitAriaLabel: string;
  /** 图片预览左旋按钮无障碍标签。 */
  imagePreviewRotateLeftAriaLabel: string;
  /** 图片预览右旋按钮无障碍标签。 */
  imagePreviewRotateRightAriaLabel: string;
  /** 图片预览移动画布工具无障碍标签。 */
  imagePreviewPanAriaLabel: string;
  /** 图片预览裁切工具无障碍标签。 */
  imagePreviewCropAriaLabel: string;
  /** 图片预览确认裁切按钮无障碍标签。 */
  imagePreviewCropConfirmAriaLabel: string;
  /** 图片预览取消裁切按钮无障碍标签。 */
  imagePreviewCropCancelAriaLabel: string;
  /** 矩形标注工具无障碍标签。 */
  imagePreviewRectAriaLabel: string;
  /** 圆形标注工具无障碍标签。 */
  imagePreviewCircleAriaLabel: string;
  /** 直线标注工具无障碍标签。 */
  imagePreviewLineAriaLabel: string;
  /** 箭头标注工具无障碍标签。 */
  imagePreviewArrowAriaLabel: string;
  /** 画笔标注工具无障碍标签。 */
  imagePreviewBrushAriaLabel: string;
  /** 马赛克工具无障碍标签。 */
  imagePreviewMosaicAriaLabel: string;
  /** 标注颜色选择标签。 */
  imagePreviewColorLabel: string;
  /** 自定义颜色选择标签。 */
  imagePreviewColorCustomLabel: string;
  /** 细线笔触无障碍标签。 */
  imagePreviewStrokeThinAriaLabel: string;
  /** 中等笔触无障碍标签。 */
  imagePreviewStrokeMediumAriaLabel: string;
  /** 粗线笔触无障碍标签。 */
  imagePreviewStrokeThickAriaLabel: string;
  /** 撤销按钮无障碍标签。 */
  imagePreviewUndoAriaLabel: string;
  /** 还原图片按钮无障碍标签。 */
  imagePreviewResetAriaLabel: string;
  /** 图片编辑取消按钮文案。 */
  imagePreviewCancelLabel: string;
  /** 图片编辑应用按钮文案。 */
  imagePreviewConfirmLabel: string;
  /** 选区工具栏加粗按钮标题。 */
  selectionTooltipStrongTitle: string;
  /** 选区工具栏斜体按钮标题。 */
  selectionTooltipEmTitle: string;
  /** 选区工具栏删除线按钮标题。 */
  selectionTooltipStrikeTitle: string;
  /** 选区工具栏行内代码按钮标题。 */
  selectionTooltipInlineCodeTitle: string;
  /** 选区工具栏链接按钮标题。 */
  selectionTooltipLinkTitle: string;
  /** 选区工具栏块转换标题。 */
  selectionTooltipTransformLabel: string;
  /** 选区工具栏段落文案。 */
  selectionTooltipTransformParagraphLabel: string;
  /** 选区工具栏标题 1 文案。 */
  selectionTooltipTransformHeading1Label: string;
  /** 选区工具栏标题 2 文案。 */
  selectionTooltipTransformHeading2Label: string;
  /** 选区工具栏标题 3 文案。 */
  selectionTooltipTransformHeading3Label: string;
  /** 选区工具栏标题 4 文案。 */
  selectionTooltipTransformHeading4Label: string;
  /** 选区工具栏标题 5 文案。 */
  selectionTooltipTransformHeading5Label: string;
  /** 选区工具栏标题 6 文案。 */
  selectionTooltipTransformHeading6Label: string;
  /** 选区工具栏无序列表文案。 */
  selectionTooltipTransformBulletListLabel: string;
  /** 选区工具栏有序列表文案。 */
  selectionTooltipTransformOrderedListLabel: string;
  /** 选区工具栏任务列表文案。 */
  selectionTooltipTransformTaskListLabel: string;
  /** 选区工具栏引用块文案。 */
  selectionTooltipTransformBlockquoteLabel: string;
  /** 选区工具栏代码块文案。 */
  selectionTooltipTransformCodeBlockLabel: string;
  /** 选区链接输入占位文案。 */
  selectionLinkInputPlaceholder: string;
  /** 选区链接保存按钮无障碍文案。 */
  selectionLinkSaveAriaLabel: string;
  /** 选区链接移除按钮无障碍文案。 */
  selectionLinkRemoveAriaLabel: string;
  /** 选区工具栏文字颜色按钮标题。 */
  selectionTooltipColorTitle: string;
  /** 选区工具栏高亮颜色按钮标题。 */
  selectionTooltipHighlightTitle: string;
  /** 颜色面板恢复默认按钮文案。 */
  colorDefaultLabel: string;
  /** 颜色名:灰色。 */
  colorNameGray: string;
  /** 颜色名:棕色。 */
  colorNameBrown: string;
  /** 颜色名:橙色。 */
  colorNameOrange: string;
  /** 颜色名:黄色。 */
  colorNameYellow: string;
  /** 颜色名:绿色。 */
  colorNameGreen: string;
  /** 颜色名:蓝色。 */
  colorNameBlue: string;
  /** 颜色名:紫色。 */
  colorNamePurple: string;
  /** 颜色名:粉色。 */
  colorNamePink: string;
  /** 颜色名:红色。 */
  colorNameRed: string;
  /** 图片说明输入占位文案。 */
  imageCaptionPlaceholder: string;
  /** 图片说明无障碍标签。 */
  imageCaptionAriaLabel: string;
  /** 标注块类型名:note。 */
  calloutKindNote: string;
  /** 标注块类型名:tip。 */
  calloutKindTip: string;
  /** 标注块类型名:important。 */
  calloutKindImportant: string;
  /** 标注块类型名:warning。 */
  calloutKindWarning: string;
  /** 标注块类型名:caution。 */
  calloutKindCaution: string;
  /** 标注块类型切换按钮无障碍文案。 */
  calloutKindButtonAriaLabel: string;
  /** 折叠块标题输入占位文案。 */
  toggleSummaryPlaceholder: string;
  /** 折叠块标题无障碍标签。 */
  toggleSummaryAriaLabel: string;
  /** 媒体嵌入:视频插入标题。 */
  mediaEmbedVideoTitle: string;
  /** 媒体嵌入:音频插入标题。 */
  mediaEmbedAudioTitle: string;
  /** 媒体嵌入:书签插入标题。 */
  mediaEmbedBookmarkTitle: string;
  /** 媒体嵌入:内嵌插入标题。 */
  mediaEmbedEmbedTitle: string;
  /** 媒体嵌入:URL 输入占位。 */
  mediaEmbedUrlPlaceholder: string;
  /** 媒体嵌入:确定按钮文案。 */
  mediaEmbedConfirmLabel: string;
  /** 媒体嵌入:视频编辑标题。 */
  mediaEmbedEditVideoTitle: string;
  /** 媒体嵌入:音频编辑标题。 */
  mediaEmbedEditAudioTitle: string;
  /** 媒体嵌入:书签编辑标题。 */
  mediaEmbedEditBookmarkTitle: string;
  /** 媒体嵌入:内嵌编辑标题。 */
  mediaEmbedEditEmbedTitle: string;
  /** 媒体嵌入:保存按钮文案。 */
  mediaEmbedSaveLabel: string;
  /** 媒体嵌入:编辑按钮无障碍标签。 */
  mediaEmbedEditAriaLabel: string;
  /** 媒体嵌入:删除按钮无障碍标签。 */
  mediaEmbedDeleteAriaLabel: string;
  /** 媒体嵌入:媒体加载失败提示。 */
  mediaEmbedLoadFailed: string;
  /** 媒体嵌入:URL 无效提示。 */
  mediaEmbedUrlInvalid: string;
  /** 代码块语言搜索占位文案。 */
  codeBlockLanguageSearchPlaceholder: string;
  /** 代码块纯文本语言文案(text)。 */
  codeBlockLanguagePlainText: string;
  /** 代码块复制按钮无障碍标签。 */
  codeBlockCopyAriaLabel: string;
  /** 代码块预览按钮无障碍标签。 */
  codeBlockPreviewAriaLabel: string;
  /** 代码块源码按钮无障碍标签。 */
  codeBlockSourceAriaLabel: string;
  /** 代码块删除按钮无障碍标签。 */
  codeBlockDeleteAriaLabel: string;
  /** 工具栏撤销按钮标题。 */
  toolbarUndoTitle: string;
  /** 工具栏重做按钮标题。 */
  toolbarRedoTitle: string;
  /** 工具栏清除格式按钮标题。 */
  toolbarClearFormatTitle: string;
  /** 工具栏插入菜单(绿色加号)按钮标题。 */
  toolbarBlockMenuTitle: string;
  /** 工具栏搜索按钮标题。 */
  toolbarSearchTitle: string;
  /** 工具栏翻译按钮标题。 */
  toolbarTranslateTitle: string;
  /** 工具栏翻译按钮标题(翻译视图激活,点击切回原文)。 */
  toolbarTranslateExitTitle: string;
  /** 工具栏翻译按钮标题(翻译失败,短暂提示)。 */
  toolbarTranslateFailedTitle: string;
  /** 工具栏布局模式按钮标题(显示控制布局块的显隐/编辑入口)。 */
  toolbarLayoutModeTitle: string;
  /** 工具栏布局模式按钮标题(布局模式激活,点击退出)。 */
  toolbarLayoutModeExitTitle: string;
  /** 工具栏源码模式按钮标题(整篇以 Markdown 源码文本编辑)。 */
  toolbarSourceModeTitle: string;
  /** 工具栏源码模式按钮标题(源码模式激活,点击退出)。 */
  toolbarSourceModeExitTitle: string;
  /** 工具栏大纲按钮标题(展开内容右侧大纲面板)。 */
  toolbarOutlineTitle: string;
  /** 工具栏大纲按钮标题(大纲展开,点击收起)。 */
  toolbarOutlineExitTitle: string;
  /** 大纲面板标题。 */
  outlinePanelTitle: string;
  /** 大纲面板空态文案(文档没有标题时)。 */
  outlineEmpty: string;
  /** 工具栏 AI 按钮标题(展开底部 AI 会话框)。 */
  toolbarAiTitle: string;
  /** 工具栏 AI 按钮标题(会话框展开,点击收起)。 */
  toolbarAiExitTitle: string;
  /** AI 会话输入占位文案。 */
  aiPanelInputPlaceholder: string;
  /** AI 生成进行中的输入占位文案。 */
  aiPanelGeneratingPlaceholder: string;
  /** AI 发送按钮标题。 */
  aiPanelSendTitle: string;
  /** AI 停止按钮标题(生成进行中)。 */
  aiPanelStopTitle: string;
  /** AI 模型选择器标题。 */
  aiPanelModelTitle: string;
  /** AI 未配置模型提示。 */
  aiPanelNoModels: string;
  /** AI 请求失败提示。 */
  aiPanelRequestFailed: string;
  /** AI 流式占位节点的生成中标签。 */
  aiStreamGeneratingLabel: string;
  /** 布局块内容行数徽标单位文案。 */
  layoutBlockLinesLabel: string;
  /** 布局块删除按钮无障碍标题。 */
  layoutBlockDeleteAriaLabel: string;
  /** 布局块源码编辑区无障碍标题。 */
  layoutBlockEditorAriaLabel: string;
  /** 布局块 HTML 沙箱展示卡 iframe 无障碍标题。 */
  layoutBlockRenderTitle: string;
  /** 工具栏正文(段落)文案,块转换下拉触发钮默认文案。 */
  toolbarBlockTransformParagraphLabel: string;
  /** 工具栏无序列表按钮标题。 */
  toolbarBulletListTitle: string;
  /** 工具栏有序列表按钮标题。 */
  toolbarOrderedListTitle: string;
  /** 工具栏任务列表按钮标题。 */
  toolbarTaskListTitle: string;
  /** 工具栏引用按钮标题。 */
  toolbarBlockquoteTitle: string;
  /** 工具栏代码块按钮标题。 */
  toolbarCodeBlockTitle: string;
  /** 工具栏分割线按钮标题。 */
  toolbarHrTitle: string;
  /** 工具栏表格按钮标题。 */
  toolbarTableTitle: string;
  /** 工具栏标注块按钮标题。 */
  toolbarCalloutTitle: string;
  /** 工具栏折叠块按钮标题。 */
  toolbarToggleTitle: string;
  /** 工具栏 CSV 数据按钮标题。 */
  toolbarCsvTableTitle: string;
  /** 工具栏 Json 数据按钮标题。 */
  toolbarDatabaseTitle: string;
  /** 工具栏视频按钮标题。 */
  toolbarVideoTitle: string;
  /** 工具栏音频按钮标题。 */
  toolbarAudioTitle: string;
  /** 工具栏网页书签按钮标题。 */
  toolbarBookmarkTitle: string;
  /** 工具栏第三方内嵌按钮标题。 */
  toolbarEmbedTitle: string;
  /** 工具栏图片按钮标题。 */
  toolbarImageTitle: string;
  /** 工具栏行内公式按钮标题。 */
  toolbarInlineMathTitle: string;
  /** 工具栏公式块按钮标题。 */
  toolbarMathBlockTitle: string;
  /** 工具栏 emoji 按钮标题。 */
  toolbarEmojiTitle: string;
  /** emoji 选择面板无障碍标签。 */
  emojiPickerTitle: string;
  /** emoji 选择面板搜索输入占位文案。 */
  emojiPickerSearchPlaceholder: string;
  /** emoji 选择面板无匹配提示。 */
  emojiPickerNoResults: string;
  /** emoji 分类:笑脸与情感。 */
  emojiPickerCategorySmileys: string;
  /** emoji 分类:人物与手势。 */
  emojiPickerCategoryGestures: string;
  /** emoji 分类:动物与自然。 */
  emojiPickerCategoryAnimals: string;
  /** emoji 分类:食物与饮料。 */
  emojiPickerCategoryFood: string;
  /** emoji 分类:活动与运动。 */
  emojiPickerCategoryActivities: string;
  /** emoji 分类:旅行与地点。 */
  emojiPickerCategoryTravel: string;
  /** emoji 分类:物品。 */
  emojiPickerCategoryObjects: string;
  /** emoji 分类:符号。 */
  emojiPickerCategorySymbols: string;
  /** 选区链接输入格式非法提示(可选;未提供时非法链接不落库也不提示文案)。 */
  selectionLinkInvalidUrl?: string;
  /** 块手柄「+」按钮无障碍/悬停文案(可选;缺省无文案)。 */
  blockHandleInsertLabel?: string;
  /** 块手柄拖拽把手无障碍文案(可选;缺省无文案)。 */
  blockHandleDragLabel?: string;
  /** 版本历史面板标题。 */
  historyPanelTitle: string;
  /** 版本历史面板空态提示。 */
  historyPanelEmpty: string;
  /** 版本历史面板恢复按钮文案。 */
  historyPanelRestore: string;
  /** 版本历史面板删除按钮文案。 */
  historyPanelDelete: string;
  /** 版本历史面板「保存版本」按钮文案。 */
  historyPanelSave: string;
  /** 恢复版本确认文案。 */
  historyPanelRestoreConfirm: string;
  /** 删除版本确认文案。 */
  historyPanelDeleteConfirm: string;
  /** 快照来源标签:自动保存。 */
  historyOriginAuto: string;
  /** 快照来源标签:手动保存。 */
  historyOriginManual: string;
  /** 快照来源标签:恢复保存。 */
  historyOriginRestore: string;
  /** 面板操作失败提示。 */
  historyOperationFailed: string;
  /** 评论面板标题。 */
  commentsPanelTitle: string;
  /** 评论输入框占位文案。 */
  commentsPanelPlaceholder: string;
  /** 评论添加按钮文案。 */
  commentsPanelAdd: string;
  /** 评论解决按钮文案。 */
  commentsPanelResolve: string;
  /** 评论重新打开按钮文案。 */
  commentsPanelReopen: string;
  /** 评论删除按钮文案。 */
  commentsPanelDelete: string;
  /** 评论锚点失效(块文本重定位失败)标记文案。 */
  commentsPanelStale: string;
  /** 评论面板空态提示。 */
  commentsPanelEmpty: string;
  /** 未选中文字时添加评论的提示。 */
  commentsPanelSelectFirst: string;
  /** 评论锚点失效跳转提示。 */
  commentsPanelStaleAnchor: string;
  /** 实时协同状态:连接中。 */
  collabStatusConnecting: string;
  /** 实时协同状态:已连接。 */
  collabStatusConnected: string;
  /** 实时协同状态:已断开。 */
  collabStatusDisconnected: string;
  /** 目录块([toc])标题文案。 */
  tocTitle: string;
  /** 目录块空态提示(文档暂无标题)。 */
  tocEmpty: string;
  /** Mermaid 图表渲染失败提示。 */
  codeBlockMermaidRenderError: string;
  /** 选区工具栏下划线按钮标题。 */
  selectionTooltipUnderlineTitle: string;
  /** 选区工具栏下标按钮标题。 */
  selectionTooltipSubscriptTitle: string;
  /** 选区工具栏上标按钮标题。 */
  selectionTooltipSuperscriptTitle: string;
  /** 工具栏下划线按钮标题。 */
  toolbarUnderlineTitle: string;
  /** 工具栏下标按钮标题。 */
  toolbarSubscriptTitle: string;
  /** 工具栏上标按钮标题。 */
  toolbarSuperscriptTitle: string;
}

/** 定义 slash 菜单支持的命令类型。 */
export type SlashMenuCommand =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'heading5'
  | 'heading6'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'blockquote'
  | 'callout'
  | 'toggle'
  | 'inlineCode'
  | 'inlineMath'
  | 'codeBlock'
  | 'mathBlock'
  | 'table'
  | 'csvTable'
  | 'database'
  /** 显示控制布局块(meditor-layout 围栏,正常模式隐藏)。 */
  | 'layoutBlock'
  | 'dateMention'
  | 'video'
  | 'audio'
  | 'bookmark'
  | 'embed'
  | 'link'
  | 'image'
  | 'emoji'
  /** 脚注(光标处插入引用标记并在文末补定义块)。 */
  | 'footnote'
  /** 目录块([toc])。 */
  | 'toc'
  /** Mermaid 图表代码块。 */
  | 'mermaid';

/** 定义块级转换支持的命令类型。 */
export type BlockTransformCommand =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'heading5'
  | 'heading6'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'blockquote'
  | 'codeBlock';

/**
 * Markdown 扩展语法开关(Typora 风偏好;缺省全部开启)。
 * 关闭的语法不再解析/渲染,源文本按普通文字保留(不丢内容)。
 */
export interface MeditorMarkdownFeatures {
  /** 行内/块级公式($…$ / $$…$$;默认 true)。 */
  math?: boolean;
  /** 上标(^x^ 语法与 <sup> 标签;默认 true)。 */
  superscript?: boolean;
  /** 下标(<sub> 标签;默认 true)。 */
  subscript?: boolean;
  /** 高亮(==x== 语法;默认 true)。 */
  highlight?: boolean;
  /** Mermaid 图表代码块(语言下拉/预览/自动渲染;默认 true)。 */
  mermaid?: boolean;
}

/** 代码块编辑行为配置。 */
export interface MeditorCodeBlockConfig {
  /** 代码块左侧显示行号(默认 false)。 */
  lineNumbers?: boolean;
  /** 代码块自动换行(默认 false:横向滚动)。 */
  wordWrap?: boolean;
}

/** 定义图片文件上传处理函数。 */
export type ImageUploadHandler = (file: File) => string | Promise<string>;

/** 定义图片上传配置。 */
export interface ImageUploadConfig {
  /** 自定义图片上传函数,返回可插入文档的图片链接。 */
  upload?: ImageUploadHandler;
  /** 允许上传的最大文件体积(字节)。 */
  maxFileSize?: number;
  /** 图片解析与序列化额外允许的 URL 协议,协议名需包含末尾冒号。 */
  allowedProtocols?: string[];
}

/** 定义 slash 菜单项结构。 */
export interface SlashMenuItem {
  /** 菜单项唯一标识。 */
  id: string;
  /** 菜单项展示文案。 */
  label: string;
  /** 菜单项分组文案。 */
  group: string;
  /** 菜单项图标键名(对应 lucide-react 图标)。 */
  icon?: string;
  /** 菜单项对应命令。 */
  command: SlashMenuCommand;
}

/** 定义 slash 菜单配置结构。 */
export interface SlashMenuConfig {
  /** 是否启用 slash 菜单。 */
  enabled?: boolean;
  /** 菜单项配置。 */
  items?: SlashMenuItem[];
}

/** 定义编辑器内置快捷键的修饰键模式。 */
export type EditorShortcutMode = 'modShift' | 'modAlt';

/** 定义编辑器变更事件回调。 */
export type EditorChangeHandler = (markdown: string) => void;

/** 编辑器搜索选项。 */
export interface EditorSearchOptions {
  search: string;
  replace: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  regexp: boolean;
}

/** 编辑器搜索结果快照。 */
export interface EditorSearchSnapshot {
  /** 当前匹配索引(从 1 开始,0 表示无匹配)。 */
  matchIndex: number;
  /** 匹配总数。 */
  matchCount: number;
  /** 是否为无效正则表达式。 */
  isInvalidExpression: boolean;
}

/**
 * 编辑器顶层块锚点(供双栏滚动同步 / 光标定位做跨栏文本映射)。
 */
export interface MeditorViewportBlock {
  /** 块在 ProseMirror 文档中的起始位置。 */
  pos: number;
  /** 块顶相对编辑区滚动容器可视顶部的偏移(px;负值表示块顶已滚出视口上方)。 */
  top: number;
  /** 块独立序列化后的 markdown 文本。 */
  markdown: string;
}

/**
 * 编辑器视口快照(滚动状态 + 可视区相交的顶层块锚点,按文档顺序)。
 */
export interface MeditorViewport {
  /** 编辑区滚动容器(宿主可直接读写 scrollTop)。 */
  scrollContainer: HTMLElement;
  /** 当前滚动偏移(scrollTop)。 */
  scrollTop: number;
  /** 内容总高度(scrollHeight)。 */
  scrollHeight: number;
  /** 视口高度(clientHeight)。 */
  clientHeight: number;
  /** 滚动进度 0~1(内容不足一屏时为 0)。 */
  progress: number;
  /** 与当前可视区相交的顶层块锚点(按文档顺序)。 */
  blocks: MeditorViewportBlock[];
}

/**
 * 顶层块的 markdown 区间映射(块文本在整篇序列化 markdown 中的精确偏移)。
 */
export interface MeditorMarkdownBlock {
  /** 块在 ProseMirror 文档中的起始位置。 */
  pos: number;
  /** 块独立序列化后的 markdown 文本。 */
  markdown: string;
  /** 块文本在整篇 markdown 中的起始偏移([start, end))。 */
  start: number;
  /** 块文本在整篇 markdown 中的结束偏移。 */
  end: number;
}

/**
 * 字数统计(CJK 逐字计数,西文按词计数)。
 */
export interface MeditorStats {
  /** 字符数(不含换行)。 */
  characters: number;
  /** 词数(CJK 字符逐字 + 西文连续字母数字串)。 */
  words: number;
}

/**
 * 标题锚点清单项(大纲面板 / [toc] 数据结构)。
 */
export interface MeditorHeading {
  /** 锚点 id(文本 slug 化 + 同名去重后缀,#锚点 链接跳转依据)。 */
  id: string;
  /** 标题级别 1~6。 */
  level: number;
  /** 标题纯文本。 */
  text: string;
  /** 节点在文档中的位置(滚动定位用)。 */
  pos: number;
}

/** 定义 Milkdown 编辑器组件的属性(纯 TS 原生版,无 React 依赖)。 */
export interface MilkdownEditorProps {
  /**
   * 编辑器受控值。传入后进入受控模式:编辑器以轮询(间隔 debounceMs,默认 250ms)
   * 检测外部 value 变更并应用;内部编辑实时输出 onChange,宿主把最新内容回写
   * value 即形成受控闭环。
   */
  value?: string;
  /** 编辑器非受控初始值。 */
  defaultValue?: string;
  /** 编辑器内容变化回调。 */
  onChange?: EditorChangeHandler;
  /** 主题模式。 */
  theme?: EditorTheme;
  /** 编辑器语言。 */
  locale?: EditorLocale;
  /** 编辑器文案覆盖项。 */
  messages?: Partial<EditorI18nMessages>;
  /**
   * 编辑区滚动容器选择器(浮层定位/搜索滚动等以 closest 就近命中)。
   * 缺省 '.zt-md-editor, .meditor-editor-area'(meditor 自带类名,行为不变);
   * 宿主改编辑区滚动容器类名时,把新类名写进此选项即可。
   */
  scrollContainerSelector?: string;
  /** 容器样式类名。 */
  className?: string;
  /** 占位提示文案。 */
  placeholder?: string;
  /** 是否只读。 */
  readOnly?: boolean;
  /** 编辑区最大高度,超出后在编辑区内部滚动。 */
  maxHeight?: CSSMaxHeight;
  /** 受控模式外部 value 的轮询检测间隔(毫秒,默认 250)。 */
  debounceMs?: number;
  /** 额外头部内容占位(纯 TS DOM 模式下为 unknown;调用方自行渲染并挂到 .zt-md-header)。 */
  headerSlot?: HeaderSlotContent;
  /** slash 菜单配置。 */
  slashMenu?: SlashMenuConfig;
  /** 图片上传配置。 */
  imageUpload?: ImageUploadConfig;
  /** 内置快捷键修饰键模式。 */
  shortcutMode?: EditorShortcutMode;
  /** 顶部工具栏配置。 */
  toolbar?: ToolbarConfig;
  /** 语雀风格块手柄(+ 按钮 / 拖拽)配置。 */
  blockHandle?: BlockHandleConfig;
  /** 是否支持中文符号快捷输入(【】任务项、1。/1、有序列表、》引用、～～删除线;默认 true)。 */
  chineseSymbols?: boolean;
  /** 显示控制布局块(meditor-layout)能力配置。 */
  layoutBlock?: LayoutBlockConfig;
  /**
   * 光标跳转回调(双栏定位用):编辑器持有焦点且光标/选区变化(非内容编辑)
   * 时触发,参数为光标所在顶层块锚点;编辑器未就绪或光标落在文档外时为 null。
   */
  onCursorNavigate?: (block: MeditorViewportBlock | null) => void;
  /**
   * 标题清单变更回调(大纲面板数据源):文档变更后(轻防抖)回调整篇标题
   * 锚点清单(按文档顺序);编辑器未就绪时不回调。
   */
  onHeadingsChange?: (headings: MeditorHeading[]) => void;
  /**
   * 自动配对括号(键入开括号插入成对符号,闭括号 overtype;默认 true)。
   */
  autoPair?: boolean;
  /**
   * Emoji `:` 输入自动补全(键入 `:` 后续中英/拼音关键词弹出候选;默认 true)。
   */
  emojiAutocomplete?: boolean;
  /**
   * Markdown 扩展语法开关(行内公式/上下标/高亮/Mermaid;缺省全部开启)。
   * 关闭项的语法文本原样保留,对应工具栏/菜单入口一并隐藏。
   */
  markdownFeatures?: MeditorMarkdownFeatures;
  /**
   * 图片显示地址解析器(仅影响显示,不写入文档):文档中的相对路径图片
   * (如 ./x.assets/a.png)经此转换为可加载的地址(桌面端 convertFileSrc 等)。
   */
  resolveImageUrl?: (src: string) => string;
  /**
   * 严格换行(GFM):段落内单独换行渲染为空格而非换行(默认 false,
   * Typora 风格显示为换行)。仅影响显示,序列化始终保留源换行。
   */
  strictLineBreaks?: boolean;
  /**
   * 智能标点(SmartyPants):键入时把直引号转成弯引号、--/--– 成破折号、
   * ... 转省略号(代码/公式内不生效;默认 false)。
   */
  smartPunctuation?: boolean;
  /** 代码块编辑行为(行号/自动换行)。 */
  codeBlock?: MeditorCodeBlockConfig;
  /** 标题自动编号(h1~h6 CSS counter 编号,仅显示;默认 false)。 */
  headingNumbering?: boolean;
  /** AI 助手能力配置(模型清单/流式实现/系统提示;缺省无模型)。 */
  ai?: AiConfig;
}

/** 定义工具栏按钮命令类型。 */
export type ToolbarCommand =
  /** 插入菜单(绿色加号,打开全功能 slash 菜单)。 */
  | 'blockMenu'
  | 'undo'
  | 'redo'
  /** 块类型转换下拉(正文/标题/列表…)。 */
  | 'blockTransform'
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'heading5'
  | 'heading6'
  | 'strong'
  | 'em'
  | 'strike'
  /** 下划线(Mod-U)。 */
  | 'underline'
  /** 下标。 */
  | 'subscript'
  /** 上标。 */
  | 'superscript'
  | 'inlineCode'
  | 'link'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'blockquote'
  | 'callout'
  | 'toggle'
  | 'codeBlock'
  | 'hr'
  | 'table'
  | 'csvTable'
  | 'database'
  | 'image'
  | 'video'
  | 'audio'
  | 'bookmark'
  | 'embed'
  | 'inlineMath'
  | 'mathBlock'
  | 'emoji'
  | 'clearFormat'
  | 'search'
  /** AI 助手(底部会话框,生成内容流式插入文档,全文级开关)。 */
  | 'ai'
  /** 大纲面板(文档标题清单,显示在内容右侧,全文级开关)。 */
  | 'outline'
  /** 布局模式(显示控制布局块 meditor-layout 的显隐/编辑开关,全文级模式)。 */
  | 'layoutMode'
  /** 源码模式(整篇以 Markdown 源码文本编辑,全文级模式)。 */
  | 'sourceMode'
  /** 整篇翻译(点击进入只读翻译视图,再次点击切回原文)。 */
  | 'translate';

/** 定义工具栏按钮配置。 */
export interface ToolbarItem {
  /** 按钮命令。 */
  command: ToolbarCommand;
  /** 图标键名(共享图标库,缺省用命令内置映射)。 */
  icon?: string;
  /** 无障碍标题(缺省用 i18n 文案)。 */
  title?: string;
  /** 下拉子项(仅 blockTransform 等下拉型命令使用)。 */
  children?: ToolbarItem[];
}

/** 定义工具栏内置模式:简洁(simple)或完整(full)。 */
export type ToolbarMode = 'simple' | 'full';

/** 工具栏翻译模式控制接口(工具栏插件就绪后交由 meditor 编排层持有)。 */
export interface ToolbarTranslateApi {
  /** 同步翻译模式到工具栏(翻译按钮高亮/标题,其余按钮禁用)。 */
  setMode: (mode: {
    /** 翻译视图是否生效。 */ active: boolean;
    /** 翻译请求是否进行中。 */ loading: boolean;
    /** 本次是否失败(按钮短暂提示失败文案)。 */ failed?: boolean;
  }) => void;
}

/** 工具栏布局模式控制接口(工具栏插件就绪后交由 meditor 编排层持有)。 */
export interface ToolbarLayoutModeApi {
  /** 同步布局模式到工具栏(布局按钮高亮/标题随动)。 */
  setMode: (mode: {
    /** 布局模式是否生效。 */ active: boolean;
  }) => void;
}

/** 工具栏源码模式控制接口(工具栏插件就绪后交由 meditor 编排层持有)。 */
export interface ToolbarSourceModeApi {
  /** 同步源码模式到工具栏(源码按钮高亮/标题随动,其余按钮禁用)。 */
  setMode: (mode: {
    /** 源码模式是否生效。 */ active: boolean;
  }) => void;
}

/** 工具栏大纲面板控制接口(工具栏插件就绪后交由 meditor 编排层持有)。 */
export interface ToolbarOutlineApi {
  /** 同步大纲面板开关态到工具栏(大纲按钮高亮/标题随动)。 */
  setMode: (mode: {
    /** 大纲面板是否展开。 */ active: boolean;
  }) => void;
}

/** 工具栏 AI 助手控制接口(工具栏插件就绪后交由 meditor 编排层持有)。 */
export interface ToolbarAiApi {
  /** 同步 AI 会话框开关态到工具栏(AI 按钮高亮/标题随动)。 */
  setMode: (mode: {
    /** AI 会话框是否展开。 */ active: boolean;
  }) => void;
}

/**
 * AI 模型配置(OpenAI 兼容接口;DeepSeek/Moonshot/自建网关等同协议)。
 */
export interface AiModelConfig {
  /** 显示名称(面板模型选择器展示)。 */
  name: string;
  /** 接口基础地址(如 https://api.deepseek.com/v1,不带尾斜杠)。 */
  baseUrl: string;
  /** API Key(Bearer 方式携带)。 */
  apiKey: string;
  /** 模型 ID(如 deepseek-chat)。 */
  model: string;
}

/** AI 会话消息。 */
export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** AI 流式请求函数(宿主可注入自有网关;缺省用内置 OpenAI 兼容 SSE 客户端)。 */
export type AiStreamChat = (request: {
  /** 本次使用的模型配置。 */
  model: AiModelConfig;
  /** 完整消息序列(含系统提示)。 */
  messages: AiChatMessage[];
  /** 中断信号(停止按钮)。 */
  signal: AbortSignal;
  /** 正文增量回调(按 SSE delta 逐段回调)。 */
  onDelta: (delta: string) => void;
}) => Promise<void>;

/** AI 助手能力配置。 */
export interface AiConfig {
  /**
   * 是否装配 AI 助手(默认 false)。默认关闭:AI 会话框、工具栏入口与相关 API
   * 均不生效;需要 AI 能力的宿主显式传 enabled: true。
   */
  enabled?: boolean;
  /** 可选模型清单(缺省空;为空时面板展示未配置提示)。 */
  models?: AiModelConfig[];
  /** 流式请求实现(缺省内置 OpenAI 兼容客户端,见 lib/ai-chat)。 */
  streamChat?: AiStreamChat;
  /** 系统提示词(缺省内置 Markdown 写作助手提示)。 */
  systemPrompt?: string;
}

/** 定义工具栏对齐方式:靠左(默认)/居中/靠右。 */
export type ToolbarAlign = 'left' | 'center' | 'right';

/** 定义顶部工具栏配置。 */
export interface ToolbarConfig {
  /** 工具栏整体是否显示(默认 true)。 */
  visible?: boolean;
  /** 内置模式(默认 'full');items 显式指定时以 items 为准。 */
  mode?: ToolbarMode;
  /** 工具栏对齐方式(默认 'left' 靠左)。 */
  align?: ToolbarAlign;
  /** 显式按钮列表(覆盖内置模式);undefined 时按 mode 取默认集。 */
  items?: ToolbarItem[];
  /**
   * 从最终按钮集中剔除指定命令(对 items 与内置默认集同样生效)。
   * 用于宿主只想去掉个别按钮(如全文级操作)而不必复刻整套默认列表;
   * 与 items 可叠加:先取 items(或默认集),再按 exclude 过滤。
   */
  exclude?: ToolbarCommand[];
}

/** 定义块手柄(+ 按钮 / 拖拽)配置。 */
export interface BlockHandleConfig {
  /** 是否启用块手柄(默认 true)。 */
  enabled?: boolean;
}

/** 定义显示控制布局块(meditor-layout)能力配置。 */
export interface LayoutBlockConfig {
  /**
   * 是否允许 meditor-layout:js 沙箱执行(默认 true)。沙箱为 allow-scripts
   * iframe(不透明 origin,无父文档/存储访问权),宿主面向不可信文档场景可关闭;
   * 关闭后 js 块与普通隐藏布局块同待遇(仅布局模式可编辑源码)。
   */
  enableScript?: boolean;
}
