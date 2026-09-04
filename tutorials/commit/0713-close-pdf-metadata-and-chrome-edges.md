# 0713 - 收口 PDF 元数据与阅读器边缘行为

## 背景

`S2-R03E` 对齐 Readest 提交 `54ad2e916`、`7786400b3` 和 `e8f7a4875`。它们分别处理 PDF iframe 上方的侧栏拖拽、滚动 PDF 页脚可读性，以及重复导入时的 PDF 元数据刷新。

## 改动

- 侧栏开始拖拽时创建覆盖整个窗口的 shield，让鼠标事件不会被 PDF iframe 截断；鼠标释放、窗口失焦和路由销毁都会清理 shield。
- 继续复用 foliate/PDF.js 读取 PDF metadata，并在解析后销毁临时文档，不新增 Rust PDF 解析依赖。
- 重导入会比较旧受管副本与新文件的 metadata，只刷新仍属于文件来源的字段，保留用户改写或主动清空的字段。
- 前端对解析 metadata 的同一个 Blob 计算 SHA-256；Rust 在落盘前对实际导入字节复算并拒绝不一致的 override。
- 新路径但内容完全相同的 PDF 会复用原记录 ID 和原受管路径，保留进度、分类、标签以及以路径为键的笔记、书签、高亮和搜索缓存。
- 内容去重只接受 canonical 后真实位于 br1 `books` 目录内的文件，拒绝外部路径和 symlink 逃逸。
- Readest 的 footer 修复依赖其 `mix-blend-mode` 样式；br1 没有该路径，因此生产 CSS 不改，只用滚动 PDF 回归证明页脚仍是不透明且不混色。

## 两个知识点

1. metadata 与文件必须属于同一次读取。前端解析后把 hash 随 override 发送，后端对真正写入的字节复算，才能避免两次读取之间文件被替换后出现“内容和标题不属于同一版本”。
2. 稳定 identity 不只是一条 record id。br1 的多类阅读状态仍以受管文件路径为键，因此相同内容去重时必须同时保留旧路径；否则记录看似保留，批注实际上会失联。

## 验证

- `pnpm test:reader-helpers`：PASS（88/88）
- `cargo test --manifest-path src-tauri/Cargo.toml --lib`：PASS（57/57）
- PDF sidebar shield、author metadata、scrolled footer：PASS（5/5）
- `pnpm check`：PASS（0 errors, 0 warnings）
- `pnpm build`：PASS
- 本任务触及 Rust 文件 `rustfmt --check`：PASS
- `git diff --check`：PASS
- fresh Terra high fix re-review：PASS（无 findings）

## 证据边界

当前证据覆盖纯函数、Rust 单测和浏览器行为，但没有用打包后的 Tauri 应用完成一次带既有笔记、书签、高亮和搜索缓存的“同内容改名导入再重开”流程。测试也没有模拟 canonicalization、hash 与写入之间的恶意文件系统竞态。全仓 `cargo fmt --check` 仍被本任务未触及 Rust 文件的既有格式差异阻塞。

本任务没有修改 `foliate-js`；审计确认它已提供所需的 PDF metadata 和 `destroy()` 生命周期。下一项是 `S2-R04A - Harden EPUB-family archive loading`。
