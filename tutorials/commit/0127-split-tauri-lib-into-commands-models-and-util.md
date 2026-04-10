# 背景

在这次整理之前，`src-tauri/src/lib.rs` 已经接近 900 行，并且混在一起放了四类内容：

- Tauri `#[command]` 命令入口
- 各种序列化模型
- Readest / library / notes / search cache 的文件工具函数
- `run()` 和命令注册

这种文件在项目早期还能忍，但一旦继续扩展 bridge、reader host 能力或 library 导入逻辑，维护成本会迅速变高：

- 找一个搜索缓存问题，要先在 900 行里定位
- 改一个 struct，要顺着大文件来回跳
- `lib.rs` 看起来像“所有东西的总仓库”

这次先做结构拆分，不改业务行为。

# 主要目标

- 把 Tauri 后端从单文件拆成更清晰的模块层次
- 保持命令名、数据结构和行为不变
- 让后续继续整理 Rust 后端时，有稳定的结构边界可依赖

# 改动概览

- 新增 [`src-tauri/src/models.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/models.rs)
  - 收纳序列化模型、内部记录结构和相关常量
- 新增 [`src-tauri/src/util.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/util.rs)
  - 收纳 library / readest / notes / search cache 共享工具函数
- 新增 [`src-tauri/src/commands/library.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/library.rs)
  - library 相关命令
- 新增 [`src-tauri/src/commands/search_cache.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/search_cache.rs)
  - search cache 相关命令
- 新增 [`src-tauri/src/commands/notes.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/notes.rs)
  - notes 相关命令
- 新增 [`src-tauri/src/commands/mod.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/mod.rs)
- [`src-tauri/src/lib.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs) 现在只保留：
  - 模块声明
  - `run()`
  - `generate_handler!` 注册

# 关键知识

## 1. 为什么先做“模块重排”，而不是一边拆一边改逻辑

很多 Rust 大文件重构时，最危险的方式是：

- 一边拆模块
- 一边改命令行为
- 一边顺手修历史问题

这会让风险叠加，很难判断到底是“拆文件出了错”，还是“行为逻辑被改坏了”。

这次刻意采用了更稳的顺序：

1. 先把已有内容按职责搬到新模块
2. 先证明 `cargo check` 和前端 `pnpm check` 仍然通过
3. 之后再考虑继续做行为层整理

这种方法的核心是：**先把结构边界整理清楚，再改边界内部。**

## 2. 为什么 `lib.rs` 应该尽量薄

在 Tauri 项目里，`lib.rs` 更适合作为“应用入口”和“模块目录”，而不是业务逻辑仓库。  
理想状态下它主要回答两个问题：

- 这个后端由哪些模块组成
- 启动时注册了哪些命令

当 `lib.rs` 过厚时，入口文件反而失去导航作用。  
拆完之后，你从 `lib.rs` 一眼就能看到当前后端大致分成：

- `commands`
- `models`
- `util`

这对后续定位代码和继续拆分都很重要。

## 3. 为什么 models / util / commands 这三层划分是个好起点

这三层不是唯一方案，但对当前 `br1` 很合适，因为它们对应的是三种稳定职责：

- `models`
  - 数据长什么样
- `util`
  - 共享文件路径、序列化、读取、清理规则
- `commands`
  - 暴露给前端的 Tauri 命令入口

这样做的好处是：

- model 变化不会再淹没在 command 代码里
- util 可以被多个 command 模块复用
- command 文件更接近“一个领域一组入口”

注意这还不是最终架构，只是一个足够稳的中间台阶。  
等以后 Rust 后端继续增长时，再决定要不要进一步细化为更强的领域模块。

# 验证

- `cargo check --manifest-path src-tauri/Cargo.toml` (PASS)
- `pnpm check` (PASS)
- `git diff --check` (PASS)

# 未覆盖项

- 这次没有修改任何 Tauri command 名称
- 这次没有主动修复已有逻辑细节或路径规则
- 后端目前仍然是以文件工具函数为主，还没有继续往更强的领域 service/use-case 结构演进
