# 0347 - 收紧 reader 本地书籍路径读取边界

这次修复处理的是一个桌面应用里很容易被低估的问题：前端 route 传进来的 `path` 不能直接当成本机文件读取权限。

在 br1 里，`/reader?source=library-file&path=...` 会进入 reader 打开链路。修复前，renderer 只要构造这个 URL，就能让 Tauri command 去读取对应路径的文件内容或指纹。对本地阅读器来说，这不是普通 bug，而是 trust boundary 问题：真正有本机文件权限的是 Tauri 后端，不是页面 URL。

## 改了什么

- `load_library_book_binary` 不再直接读取 renderer 传入的 `file_path`。
- `load_library_file_fingerprint` 不再直接对 renderer 传入路径取 metadata。
- `load_library_cover_data_urls` 只允许读取 br1 library root 里的图片资产。
- 新增 `TrustedAssociatedBookOpenPaths`，把经过 open-with / associated-open 正规化后的外部书籍路径登记为可信来源。
- `queue_associated_book_open_requests` 只在 `webdriver` feature 下暴露，避免生产 renderer 自己登记任意外部路径。
- reader 可读的书籍路径现在只有两类：br1 managed library root 内的书籍，或已经由 associated-open 队列登记过的外部书籍。

## 为什么不能只在前端挡

前端可以避免正常 UI 生成危险 URL，但它不能成为安全边界。用户、测试、外部窗口、甚至将来的 deep link 都可能构造 reader route。

所以这类检查必须放在 Tauri command 内部：

- 先 canonicalize 路径，避免 `..`、符号链接、相对路径绕过。
- 再检查扩展名白名单，避免任意文件被当成书籍读取。
- 最后检查来源：library root 或 trusted associated-open allowlist。

## open-with 为什么需要 allowlist

如果只允许 library root，macOS open-with / file association 打开的外部书籍会被误杀。

这次没有把 open-with 改成“先导入再打开”，而是保留当前产品语义：外部文件可以直接打开，但必须先经过 Tauri 侧的 `normalize_associated_book_requests`。只有这个流程规范化过的路径才会进入 `TrustedAssociatedBookOpenPaths`，reader 后续读取时才放行。

这里还有一个容易漏掉的点：测试用的 queue command 也不能在生产里公开。否则 renderer 可以先调用 queue command 把任意支持格式路径登记进 allowlist，再调用 reader 文件读取命令。这会把刚建好的边界又绕回去了。

所以生产入口只保留 Rust runtime 的 open-with 事件流；webdriver 测试入口通过 `#[cfg(feature = "webdriver")]` 单独打开。

## 关键实现点

- `canonicalize_existing_file_path` 负责把输入路径转成真实存在的 canonical file。
- `resolve_trusted_library_book_path` 统一保护 book binary 和 fingerprint 两个入口。
- `resolve_library_owned_cover_path` 单独保护 cover data URL 入口。
- `queue_associated_book_open_requests_runtime` 在入队前登记可信 associated-open 路径。
- `queue_associated_book_open_requests` 只随 webdriver 测试 feature 编译进 invoke handler。

## 验证

- `cargo check --manifest-path src-tauri/Cargo.toml`
- `cargo check --manifest-path src-tauri/Cargo.toml --no-default-features --features webdriver`
- `pnpm check`
- `git diff --check -- tutorials/commit/0347-secure-library-file-paths.md src-tauri/src/models.rs src-tauri/src/lib.rs src-tauri/src/commands/library.rs`
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'normalizes associated book requests before opening a separate reader window' --mochaOpts.timeout 120000"`

## 还没做

- 没有清理全仓既存 whitespace 噪音。
- 没有把所有 Tauri 文件命令抽成统一安全模块。
- 没有新增专门的恶意 route negative regression；这次先用 open-with positive regression 保证修复不破坏正常入口。
