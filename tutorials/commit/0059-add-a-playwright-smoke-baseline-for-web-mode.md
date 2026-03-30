# 0059: 给 br1 加一条 Playwright 的 web smoke baseline

这次不是在修产品功能，而是在补自动化基础设施。

你现在想同时打通两条自动化线：

- 桌面自动化
- Playwright

如果 Playwright 这条线都还没有最小基线，后面每次调 reader、library、导入动线时，都只能靠手点。效率很低，也不利于回归。

所以这一步的目标很窄：

- 先让 `br1` 在 **web mode** 下能被 Playwright 拉起来
- 先跑一条最小 smoke test
- 证明“自动启动 dev server -> 打开页面 -> 断言关键 UI”这条链是通的

## 这次做了什么

### 1. 加了 Playwright 依赖和脚本

在 [package.json](/Users/dev/workspace2/hc_apps/br1/package.json) 里补了：

- `@playwright/test`
- `pnpm test:e2e`

这样以后在仓库里就有一个标准入口，而不是每次临时想命令。

### 2. 加了 Playwright 配置

新增 [playwright.config.ts](/Users/dev/workspace2/hc_apps/br1/playwright.config.ts)：

- 测试目录固定为 `tests/e2e`
- 自动拉起 `pnpm dev --host 127.0.0.1 --port 4173`
- `baseURL` 固定成 `http://127.0.0.1:4173`
- 默认用 Chromium

这里故意没有直接绑 `tauri dev`，因为当前先要把 **web mode** 这条线跑稳。桌面自动化后面单独做。

### 3. 加了第一条 smoke test

新增 [library-smoke.spec.ts](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts)。

这条测试只做一件事：

- 打开 `/library`
- 确认搜索框、书架标题、第一本书入口、导入入口都存在

它不测 reader 引擎、不测 Tauri、不测导入权限。先把最小可重复自动化路径站住。

## 为什么先做 web mode

因为桌面自动化天然更脆：

- 窗口权限
- macOS Accessibility
- 坐标点击
- 窗口前置状态
- 多窗口切换

这些都会让“自动化失败”掺进太多非产品因素。

Playwright 的 web mode 更像一条稳定的基线。先有这条基线，后面你调桌面自动化时，至少知道：

- 页面本身能正常启动
- 关键 UI 是存在的
- 基本路由没有死

## 这次对应的知识点

### 1. 为什么 E2E 配置里要自己拉 dev server

在 Playwright 里，`webServer` 的作用就是：

- 测试前先启动站点
- 等它可访问
- 测试结束再回收

这样你执行 `pnpm test:e2e` 时，不需要先手动开一个 dev server。

这是把“测试依赖的运行环境”写进测试配置，而不是写进人的脑子里。

### 2. 为什么 smoke test 要先测“页面存在”，而不是一上来测复杂交互

自动化刚起步时，最重要的不是覆盖率，而是 **稳定性**。

先做 smoke test 的好处是：

- 失败时更容易定位
- 不容易被复杂状态拖垮
- 能快速证明整条自动化链已经存在

也就是说，先保证“能跑”，再保证“跑得深”。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## 这次没包含什么

- 还没有桌面自动化脚本
- 还没有测试 reader 新窗口
- 还没有把 Playwright 接到 Tauri mocked API 或更复杂导入流上
