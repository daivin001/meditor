/**
 * src/image-strategy.ts — 图片插入策略(对齐 Typora 图像偏好)
 *
 * 三种策略:
 * - embed:内嵌 base64 data URL(默认;.md 自包含可移植,文件体积大);
 * - assets:复制到文档旁 `${文档名}.assets/` 目录,markdown 写相对引用
 *   (./x.assets/pic.png),显示经 convertFileSrc 转换;
 * - upload:上传图床。优先自定义上传命令(Typora 同款约定:命令模板 +
 *   图片路径追加为末参,stdout 取第一个 URL);否则 POST PicGo server
 *   (默认 http://127.0.0.1:36677/upload,{list:[临时文件路径]})。
 *
 * 浏览器开发态(Tauri 后端不可用):一切回退 embed,不阻塞编辑。
 */
import { convertFileSrc, invoke } from '@tauri-apps/api/core';

/** 图片插入策略。 */
export type ImageStrategy = 'embed' | 'assets' | 'upload';

/** 图片上传偏好(ShellPrefs 图片段子集)。 */
export interface ImageUploadPrefs {
  /** 图片插入策略。 */
  imageStrategy: ImageStrategy;
  /** PicGo server 地址(upload 模式;自定义命令为空时使用)。 */
  picgoUrl: string;
  /** 自定义上传命令模板(upload 模式;非空时优先于 PicGo)。 */
  uploadCommand: string;
}

/** 插入上下文:当前文档路径(未保存文档为 null)。 */
export interface ImageInsertContext {
  docPath: string | null;
}

/** 是否运行在 Tauri WebView(浏览器开发态回退 embed)。 */
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** 读取文件字节。 */
async function readFileBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

/** 字节 → base64(分块避免 btoa 参数超限)。 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

/** 相对 markdown 引用 → 可显示地址(浏览器开发态原样返回)。 */
export function resolveLocalImageSrc(src: string, docPath: string | null): string {
  if (!src || !docPath || !isTauri()) {
    return src;
  }
  if (/^(https?|data|blob|asset|file|ipc):/i.test(src) || src.startsWith('/')) {
    return src;
  }
  let relative = src;
  while (relative.startsWith('./')) {
    relative = relative.slice(2);
  }
  try {
    relative = decodeURIComponent(relative);
  } catch {
    /* 保留原文 */
  }
  const dir = docPath.replace(/[\\/][^\\/]*$/, '');
  const absolute = `${dir}/${relative.replace(/\\/g, '/')}`;
  return convertFileSrc(absolute);
}

/** 按偏好上传/转换一张图片,返回写入 markdown 的地址。 */
export async function insertImageWithPrefs(
  file: File,
  prefs: ImageUploadPrefs,
  context: ImageInsertContext
): Promise<string> {
  const bytes = await readFileBytes(file);
  const fallbackEmbed = (): string =>
    `data:${file.type || 'image/png'};base64,${bytesToBase64(bytes)}`;

  // 浏览器开发态或未指定策略:一律内嵌。
  if (!isTauri() || prefs.imageStrategy === 'embed') {
    return fallbackEmbed();
  }

  // 未保存文档没有落点目录/上传基准:回退内嵌。
  if (!context.docPath) {
    throw new Error('UNSUPPORTED_CONTEXT');
  }

  if (prefs.imageStrategy === 'assets') {
    const asset = await invoke<{ relative: string; absolute: string }>('save_image_asset', {
      docPath: context.docPath,
      fileName: file.name,
      bytes: Array.from(bytes)
    });
    return encodeURI(asset.relative).replace(/%2C/g, ',');
  }

  // upload:自定义命令优先,其次 PicGo server。
  const tempPath = await invoke<string>('write_temp_bytes', {
    fileName: file.name || 'image.png',
    bytes: Array.from(bytes)
  });
  if (prefs.uploadCommand.trim()) {
    // 命令模板由 Rust 侧配置持有(set_upload_command_config 写入),
    // 此处只传图片路径,不经 IPC 传命令体。
    return await invoke<string>('run_upload_command', { imagePath: tempPath });
  }
  const responseText = await invoke<string>('http_post_json', {
    url: prefs.picgoUrl,
    body: JSON.stringify({ list: [tempPath] })
  });
  const parsed = JSON.parse(responseText) as { success?: boolean; result?: unknown };
  const url = Array.isArray(parsed.result) ? parsed.result[0] : undefined;
  if (parsed.success !== true || typeof url !== 'string' || !url) {
    throw new Error(parsed.success === false ? '图床返回失败' : '图床响应格式无法识别');
  }
  return url;
}

/** PicGo server 连通性测试(设置面板「测试」按钮):传一个 1x1 png。 */
export async function testImageUploader(prefs: ImageUploadPrefs): Promise<string> {
  if (!isTauri()) {
    throw new Error('浏览器开发态不支持上传测试');
  }
  // 1x1 透明 PNG。
  const png = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
    0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f,
    0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00,
    0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
  ]);
  const tempPath = await invoke<string>('write_temp_bytes', {
    fileName: 'meditor-upload-test.png',
    bytes: Array.from(png)
  });
  if (prefs.uploadCommand.trim()) {
    return await invoke<string>('run_upload_command', { imagePath: tempPath });
  }
  const responseText = await invoke<string>('http_post_json', {
    url: prefs.picgoUrl,
    body: JSON.stringify({ list: [tempPath] })
  });
  const parsed = JSON.parse(responseText) as { success?: boolean; result?: unknown };
  const url = Array.isArray(parsed.result) ? parsed.result[0] : undefined;
  if (parsed.success !== true || typeof url !== 'string' || !url) {
    throw new Error('图床响应异常');
  }
  return url;
}

/** 导出 HTML 前把相对路径图片内嵌为 data URL(导出文件自包含)。 */
export async function inlineLocalImagesForExport(html: string, docPath: string | null): Promise<string> {
  if (!docPath || !isTauri() || !html.includes('<img')) {
    return html;
  }
  const documentNode = new DOMParser().parseFromString(html, 'text/html');
  const images = Array.from(documentNode.querySelectorAll('img[src]'));
  for (const image of images) {
    const src = image.getAttribute('src') ?? '';
    if (!src || /^(https?|data|blob|asset|file|ipc):/i.test(src) || src.startsWith('/')) {
      continue;
    }
    let relative = src;
    while (relative.startsWith('./')) {
      relative = relative.slice(2);
    }
    try {
      relative = decodeURIComponent(relative);
    } catch {
      /* 保留原文 */
    }
    const dir = docPath.replace(/[\\/][^\\/]*$/, '');
    const absolute = `${dir}/${relative.replace(/\\/g, '/')}`;
    try {
      const bytes = await invoke<number[]>('read_file_bytes', { path: absolute });
      image.setAttribute('src', `data:image/png;base64,${bytesToBase64(new Uint8Array(bytes))}`);
    } catch {
      /* 读取失败的图片保留原引用(导出文件中不可见,文档仍可修) */
    }
  }
  return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
}
