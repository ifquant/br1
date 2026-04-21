# 0381 - Stabilize the Tauri WebDriver Harness

## 背景

桌面端 WebDriver 测试以前会直接使用当前用户的 `HOME`。这会让测试读到真实的 br1 / Readest 本地状态，导致结果取决于机器里已有的书库、PDF、Readest 数据和 macOS `/var` 到 `/private/var` 的路径别名。

这次提交把 WebDriver harness 改成受控环境：每次测试默认创建临时 `HOME`，同时保留原来的 `CARGO_HOME` / `RUSTUP_HOME`，避免 Cargo 工具链被隔离掉。

## 关键实现

`scripts/automation/test-tauri-webdriver.sh` 现在会：

- 创建临时 `BR1_E2E_HOME`，并在退出时清理。
- 在临时 HOME 下 seed 一个最小 Readest fixture。
- 用参数数组直接执行测试命令，避免 `eval` 误解析 grep 表达式。

`e2e/app.e2e.ts` 现在会：

- 统一归一化 `/private/var`、`/var` 和重复斜杠路径别名。
- 使用受控导入 fixture，而不是依赖真实用户书库。
- 将桌面端 selector 对齐当前中文 UI。
- 对 PDF restore 测试显式 seed 已存进度，验证恢复已存状态，而不是假设首次打开 PDF 一定会自然写入进度。

`src-tauri/src/commands/library.rs` 修正了恢复书库副本时的路径校验：不存在的目标文件需要通过已存在父目录的 canonical path 验证是否在书库根目录内，而不能先做纯字符串 `starts_with`。macOS 临时目录经常会在 `/var` 和 `/private/var` 之间切换表示，纯字符串检查会误拒绝合法书库目标。

## 验证

本轮通过的关键检查：

- `pnpm check`
- `cargo test --manifest-path src-tauri/Cargo.toml --features webdriver`
- `cargo clippy --manifest-path src-tauri/Cargo.toml --features webdriver -- -D warnings`
- `git diff --check`

桌面端全量 `pnpm test:e2e:tauri` 仍未全绿，但已从隔离前的真实状态污染中收口出稳定失败面：剩余失败集中在 reader 自然进度、阅读设置持久化和搜索缓存恢复，不再是 Tauri 信任边界或 Readest fixture 缺失问题。
