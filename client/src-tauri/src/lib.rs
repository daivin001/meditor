//! src-tauri/src/lib.rs — MEditor Tauri 后端
//!
//! 职责:文件读写(UTF-8 优先,GB18030 兜底)、关闭拦截(转发
//! meditor://close-requested)、启动载荷(frontend_ready 直接返回:启动
//! 参数 .md 路径 + 未保存页签会话)、文件状态查询(前端轮询发现外部
//! 修改)、图片落盘(复制到 `${文档名}.assets/` 并返回相对引用)、
//! 图床上传转发(PicGo server HTTP / 自定义上传命令)、主题目录扫描与
//! 资源管理器定位。窗口无系统边框,最小化/最大化/关闭经 core:window
//! 权限由前端自绘标题栏调用;标题经 set_title 命令同步。
//!
//! 文件对话框与确认框由前端经 tauri-plugin-dialog 调起;快捷键与应用内
//! 工具栏由前端接管,不建原生菜单。

use std::{fs, path::Path, path::PathBuf, time::UNIX_EPOCH};

use tauri::{AppHandle, Emitter, Manager, WindowEvent};

/// 读取文本文件:UTF-8 优先,失败时按 GB18030 兜底解码(Windows 旧中文 .md 常见)。
fn read_text_lossy(path: &Path) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|e| format!("读取失败:{e}"))?;
    let bytes = bytes
        .strip_prefix([0xEF, 0xBB, 0xBF].as_slice())
        .unwrap_or(&bytes);
    match std::str::from_utf8(bytes) {
        Ok(text) => Ok(text.to_owned()),
        Err(_) => {
            let (decoded, _, had_errors) = encoding_rs::GB18030.decode(bytes);
            if had_errors {
                Err("文件不是有效的 UTF-8 或 GB18030 文本".to_owned())
            } else {
                Ok(decoded.into_owned())
            }
        }
    }
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    read_text_lossy(Path::new(&path))
}

#[tauri::command]
fn write_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| format!("写入失败:{e}"))
}

/// 读取任意文件字节(导出 HTML 时把相对路径图片内嵌为 data URL)。
#[tauri::command]
fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| format!("读取失败:{e}"))
}

/// 清理文件名:取 base 名,仅保留常见安全字符,其余替换为下划线。
fn sanitize_filename(name: &str) -> String {
    let base = name.rsplit(['\\', '/']).next().unwrap_or("image");
    let cleaned: String = base
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || matches!(c, '.' | '-' | '_' | ' ' | '(' | ')') {
                c
            } else {
                '_'
            }
        })
        .collect();
    let trimmed = cleaned.trim();
    if trimmed.is_empty() {
        "image".to_owned()
    } else {
        trimmed.to_owned()
    }
}

/// 图片落盘结果:文档内相对引用 + 磁盘绝对路径(显示转换用)。
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ImageAsset {
    relative: String,
    absolute: String,
}

/// 把图片字节写入文档旁的 `${文档名}.assets/` 目录(重名自动追加序号),
/// 返回 markdown 相对引用(如 ./notes.assets/pic.png)与绝对路径。
#[tauri::command]
fn save_image_asset(doc_path: String, file_name: String, bytes: Vec<u8>) -> Result<ImageAsset, String> {
    let doc = Path::new(&doc_path);
    let dir = doc.parent().ok_or("无法定位文档目录")?;
    let stem = doc
        .file_stem()
        .and_then(|s| s.to_str())
        .ok_or("文档名无效")?;
    let assets_dir = dir.join(format!("{stem}.assets"));
    fs::create_dir_all(&assets_dir).map_err(|e| format!("创建图片目录失败:{e}"))?;

    let base = sanitize_filename(&file_name);
    let ext = Path::new(&base)
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_owned());
    let stem_name = Path::new(&base)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("image")
        .to_owned();
    let mut candidate = base.clone();
    let mut counter = 1u32;
    while assets_dir.join(&candidate).exists() {
        candidate = match &ext {
            Some(e) => format!("{stem_name}-{counter}.{e}"),
            None => format!("{stem_name}-{counter}"),
        };
        counter += 1;
    }

    let target = assets_dir.join(&candidate);
    fs::write(&target, &bytes).map_err(|e| format!("写入图片失败:{e}"))?;
    Ok(ImageAsset {
        relative: format!("./{stem}.assets/{}", candidate.replace('\\', "/")),
        absolute: target.to_string_lossy().to_string(),
    })
}

/// 后端转发 HTTP POST(JSON):本地图床(PicGo server)走这里,
/// 避开 WebView 对 localhost 的 CORS 限制。返回响应体文本。
#[tauri::command]
fn http_post_json(url: String, body: String) -> Result<String, String> {
    let response = ureq::post(&url)
        .timeout(std::time::Duration::from_secs(30))
        .set("Content-Type", "application/json")
        .send_string(&body)
        .map_err(|e| format!("请求失败:{e}"))?;
    response.into_string().map_err(|e| format!("响应读取失败:{e}"))
}

/// 按空白切分命令模板(支持引号包裹的带空格路径/参数)。
fn split_command_template(command: &str) -> Vec<String> {
    let mut parts = Vec::new();
    let mut current = String::new();
    let mut in_quotes: Option<char> = None;
    for c in command.chars() {
        if let Some(quote) = in_quotes {
            if c == quote {
                in_quotes = None;
            } else {
                current.push(c);
            }
        } else if c == '"' || c == '\'' {
            in_quotes = Some(c);
        } else if c.is_whitespace() {
            if !current.is_empty() {
                parts.push(std::mem::take(&mut current));
            }
        } else {
            current.push(c);
        }
    }
    if !current.is_empty() {
        parts.push(current);
    }
    parts
}

/// 自定义上传命令配置文件:应用本地数据目录下的 upload-command.json。
/// 命令模板由 Rust 侧持有、Rust 侧读取执行,前端 invoke run_upload_command
/// 时只传图片路径——进程执行入口不暴露"逐次传命令"的 IPC 参数面。
fn upload_command_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("upload-command.json"))
}

/// 读取已配置的自定义上传命令模板(未配置返回空串)。
#[tauri::command]
fn get_upload_command_config(app: AppHandle) -> Result<String, String> {
    let path = upload_command_config_path(&app)?;
    let raw = match fs::read_to_string(&path) {
        Ok(raw) => raw,
        Err(_) => return Ok(String::new()),
    };
    let value: serde_json::Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    Ok(value
        .get("command")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_owned())
}

/// 保存自定义上传命令模板(设置界面变更时由前端写回;trim + 长度上限)。
#[tauri::command]
fn set_upload_command_config(app: AppHandle, command: String) -> Result<(), String> {
    let trimmed = command.trim();
    if trimmed.chars().count() > 4000 {
        return Err("上传命令过长(上限 4000 字符)".to_owned());
    }
    let path = upload_command_config_path(&app)?;
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| format!("创建配置目录失败:{e}"))?;
    }
    let payload = serde_json::json!({ "command": trimmed });
    fs::write(&path, serde_json::to_string(&payload).map_err(|e| e.to_string())?)
        .map_err(|e| format!("写入配置失败:{e}"))
}

/// 自定义上传命令(Typora 同款约定):模板如 `picgo upload` 或
/// `"C:\tools\up.bat" -q`,图片临时路径追加为最后一个参数;取 stdout 中
/// 第一个 http(s) 链接作为图床地址。命令模板从本机配置文件读取
/// (set_upload_command_config 写入),不经 IPC 参数传入。
#[tauri::command]
fn run_upload_command(app: AppHandle, image_path: String) -> Result<String, String> {
    let command = get_upload_command_config(app.clone())?;
    let parts = split_command_template(&command);
    let (program, args) = parts
        .split_first()
        .ok_or("未配置自定义上传命令(设置 → 图片 → 上传命令)")?;
    let mut cmd = std::process::Command::new(program);
    cmd.args(args).arg(&image_path);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // CREATE_NO_WINDOW:不闪命令行黑框。
        cmd.creation_flags(0x0800_0000);
    }
    let output = cmd.output().map_err(|e| format!("启动上传命令失败:{e}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    if !output.status.success() && stdout.trim().is_empty() {
        return Err(format!(
            "上传命令失败:{}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    stdout
        .split_whitespace()
        .find(|token| token.starts_with("http://") || token.starts_with("https://"))
        .map(|token| {
            token
                .trim_matches(|c: char| c == '"' || c == '\'' || c == ')' || c == ',')
                .to_owned()
        })
        .ok_or("上传命令未输出图片链接(stdout 需包含 http(s) URL)".to_owned())
}

/// 列出目录下指定扩展名的文件名(主题文件夹扫描;.css)。
#[tauri::command]
fn list_dir_files(dir: String, ext: String) -> Vec<String> {
    let mut names = Vec::new();
    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if name.to_lowercase().ends_with(&ext.to_lowercase()) {
                        names.push(name.to_owned());
                    }
                }
            }
        }
    }
    names.sort();
    names
}

/// 写入临时文件(图床上传前的中转),返回绝对路径。
#[tauri::command]
fn write_temp_bytes(app: AppHandle, file_name: String, bytes: Vec<u8>) -> Result<String, String> {
    let dir = app
        .path()
        .temp_dir()
        .map_err(|e| e.to_string())?
        .join("meditor-upload");
    fs::create_dir_all(&dir).map_err(|e| format!("创建临时目录失败:{e}"))?;
    let target = dir.join(sanitize_filename(&file_name));
    fs::write(&target, &bytes).map_err(|e| format!("写入临时文件失败:{e}"))?;
    Ok(target.to_string_lossy().to_string())
}

/// 确保目录存在(主题文件夹等;不存在则创建)。
#[tauri::command]
fn ensure_dir(dir: String) -> Result<(), String> {
    fs::create_dir_all(&dir).map_err(|e| format!("创建目录失败:{e}"))
}

/// 在资源管理器中定位文件/目录(主题文件夹「打开位置」)。
#[tauri::command]
fn reveal_in_shell(path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        std::process::Command::new("explorer")
            .arg(format!("/select,{path}"))
            .spawn()
            .map_err(|e| format!("打开目录失败:{e}"))?;
        return Ok(());
    }
    #[cfg(not(windows))]
    {
        let _ = &path;
        Err("仅支持 Windows".to_owned())
    }
}

/// 文件状态:供前端轮询发现磁盘上的外部修改。
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct FileStat {
    mtime_ms: u64,
    size: u64,
}

/// 查询文件 mtime/size;文件不存在(被外部删除/移动)返回 null。
#[tauri::command]
fn stat_file(path: String) -> Option<FileStat> {
    let meta = fs::metadata(&path).ok()?;
    let mtime = meta.modified().ok()?.duration_since(UNIX_EPOCH).ok()?;
    Some(FileStat {
        mtime_ms: mtime.as_millis() as u64,
        size: meta.len(),
    })
}

/// 未保存会话文件:应用本地数据目录下的 session.json。
fn session_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("session.json"))
}

/// 关闭/编辑时由前端暂存全部页签会话:JSON 结构由前端组装(带 version
/// 字段自演进),后端原样落盘;旧版单文档格式由前端在恢复时归一化。
/// 会话文件保留到下一次覆盖写入或 clear_session,应用崩溃后依然可恢复。
#[tauri::command]
fn save_session(app: AppHandle, session: serde_json::Value) -> Result<(), String> {
    let path = session_path(&app)?;
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| format!("创建会话目录失败:{e}"))?;
    }
    fs::write(&path, serde_json::to_string(&session).map_err(|e| e.to_string())?)
        .map_err(|e| format!("写入会话失败:{e}"))
}

/// 清除未保存会话(内容已保存或无需恢复时)。
#[tauri::command]
fn clear_session(app: AppHandle) {
    if let Ok(path) = session_path(&app) {
        let _ = fs::remove_file(path);
    }
}

/// 同步窗口标题(带脏标记与文件名)。
#[tauri::command]
fn set_title(app: AppHandle, title: String) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_title(&title);
    }
}

/// 关闭确认后的实际关窗(destroy 绕过 CloseRequested 拦截)。
#[tauri::command]
fn close_now(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.destroy();
    }
}

/// 前端就绪后返回启动载荷:invoke 直取。命令行携带 .md 路径(文件关联/
/// 拖到 exe)时附带其内容供前端新开页签;未保存会话(全部页签)只要存在
/// 就始终返回——先恢复会话页签,再打开参数文件,互不挤掉(记事本行为)。
#[tauri::command]
fn frontend_ready(app: AppHandle) -> Result<serde_json::Value, String> {
    let mut payload = serde_json::Map::new();
    if let Some(arg) = std::env::args().nth(1) {
        if Path::new(&arg).is_file() {
            if let Ok(markdown) = read_text_lossy(Path::new(&arg)) {
                payload.insert("path".into(), serde_json::Value::String(arg));
                payload.insert("markdown".into(), serde_json::Value::String(markdown));
            }
        }
    }
    if let Ok(path) = session_path(&app) {
        if let Ok(raw) = fs::read_to_string(&path) {
            if let Ok(session) = serde_json::from_str::<serde_json::Value>(&raw) {
                let has_tabs = session
                    .get("tabs")
                    .and_then(|v| v.as_array())
                    .is_some_and(|a| !a.is_empty());
                // 旧版单文档会话(markdown 字符串)交前端归一化成页签
                let legacy = session.get("markdown").and_then(|v| v.as_str()).is_some();
                if has_tabs || legacy {
                    payload.insert("session".into(), session);
                }
            }
        }
    }
    Ok(serde_json::Value::Object(payload))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 单实例:文件关联双击第二个 .md 时,转发路径给已开窗口(meditor://open-file)。
        // 文档要求此插件必须最先注册。
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let Some(path) = args.iter().nth(1) else {
                return;
            };
            if Path::new(path).is_file() {
                let _ = app.emit("meditor://open-file", path.clone());
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .on_window_event(|window, event| {
            // 关闭拦截:交给前端做脏确认后调用 close_now。
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.emit("meditor://close-requested", ());
            }
        })
        .invoke_handler(tauri::generate_handler![
            read_file, write_file, read_file_bytes, stat_file, set_title, close_now,
            frontend_ready, save_session, clear_session, save_image_asset, write_temp_bytes,
            http_post_json, run_upload_command, get_upload_command_config,
            set_upload_command_config, list_dir_files, reveal_in_shell, ensure_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
