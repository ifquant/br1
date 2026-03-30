# 0061: 给 br1 补一条更接近 Readest 的 Tauri WebDriver 基线

这次不是继续强化 `cliclick` 脚本，而是开始往 `Readest` 的正式桌面自动化方式对齐。

`Readest` 的桌面自动化不是靠：

- `osascript`
- `cliclick`

来当主测试方式的。

它更正式的路径是：

- 给 Tauri 打开 `webdriver` feature
- 启动带 webdriver 的桌面 app
- 等待 `4445/status`
- 再让上层测试框架去连这个 WebDriver 通道

所以这一步的目标很明确：

- 在 `br1` 里先把 **WebDriver 通道本身** 站起来
- 还不急着上 WebdriverIO 或更多桌面用例

## 这次做了什么

### 1. 给 Tauri 加了 `webdriver` feature

在 [Cargo.toml](/Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml) 里补了：

- `webdriver = ["tauri-plugin-webdriver"]`
- `tauri-plugin-webdriver` 作为可选依赖

这和 `Readest` 的做法是一致的：平时不带这个插件，只有测试场景才打开。

### 2. 在运行时按 feature 条件加载插件

在 [lib.rs](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs) 里：

- `#[cfg(feature = "webdriver")]`
- 只有开了这个 feature 时，才 `plugin(tauri_plugin_webdriver::init())`

这很重要，因为自动化插件不应该污染普通开发和普通打包路径。

### 3. 补了 webdriver 专用 capability

新增 [webdriver.json](/Users/dev/workspace2/hc_apps/br1/src-tauri/capabilities-extra/webdriver.json)

这份 capability 的作用是：

- 当页面来自 `http://127.0.0.1:*` 或 `http://localhost:*`
- 仍然允许需要的 plugin 权限

这也是 `Readest` 的关键做法之一。否则桌面测试时，远程 URL 往往会卡在 capability 权限上。

### 4. 补了一条启动 smoke 脚本

新增 [test-tauri-webdriver.sh](/Users/dev/workspace2/hc_apps/br1/scripts/automation/test-tauri-webdriver.sh)

这条脚本会：

1. 启动 `pnpm dev`
2. 等待 `http://127.0.0.1:1420`
3. 启动 `pnpm tauri dev --features webdriver --no-watch`
4. 等待 `http://127.0.0.1:4445/status`
5. 如果 WebDriver ready，就直接报 `PASS`

这条脚本现在还不是“桌面测试套件”，但它已经是正式桌面自动化的入口基线了。

## 为什么这一步比继续加桌面点击脚本更值钱

因为 `cliclick` 脚本适合做：

- 快速 smoke
- 权限验证
- 最小桌面动作复现

但它不适合成为长期主自动化方案。原因是它太依赖：

- 窗口位置
- 坐标
- Accessibility
- 当前显示器环境

WebDriver 这条线更接近“真正可维护的桌面自动化”。

## 这次对应的知识点

### 1. feature flag 不是只给业务功能用的

很多人一提 feature flag，就只想到“给用户开关某个产品功能”。

其实在 Rust/Tauri 里，feature flag 也很适合拿来控制：

- 测试插件
- 平台特定能力
- 重型依赖
- 只在 CI 或测试环境才需要的功能

这里的 `webdriver` 就是典型例子。

它不是产品功能，而是**测试基础设施开关**。

### 2. 自动化里最先站住的，通常不是测试用例，而是测试通道

桌面自动化最开始最容易犯的错是：

- 还没有稳定的测试通道
- 就急着写很多测试用例

结果是每个用例都不稳定。

正确顺序通常是：

1. 通道能不能起
2. 被测 app 能不能被远程连上
3. 再开始写上层场景

所以这次只验证 `4445/status`，并不寒酸，反而是对的顺序。

## 验证

- `cargo check --manifest-path /Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml --features webdriver`
- `bash /Users/dev/workspace2/hc_apps/br1/scripts/automation/test-tauri-webdriver.sh`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## 这次没包含什么

- 还没有引入 WebdriverIO 或 Tauri WebDriver 端到端用例
- 还没有把这条通道接到 reader/library 的真实桌面断言上
- 这一步只负责把 `Readest` 式的 WebDriver 基线站起来
