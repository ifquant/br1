# 背景

reader 顶栏左侧之前那个按钮虽然画出来了，但语义不太对：

- 它写的是 `Open book`
- 但在一个已经打开书的 reader 窗口里，用户更常见的下一步其实是“回到书库”

Readest 的顶栏也更强调：

- 从 reader 回 library
- 再从 library 选下一本书

所以这次不扩菜单、不改阅读逻辑，只把这个入口先校正成一个真正的 `Go to library`。

# 主要目标

- 给 reader 顶栏补一个真实的“回到书库”入口
- 在独立 reader 窗口下，尽量表现得更像桌面应用：
  - 聚焦主窗口
  - 关闭当前 reader 窗口
- 在普通页面环境下，退回到正常的 `/library` 路由跳转

# 改动概览

- [`src/lib/services/readerWindow.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/services/readerWindow.ts)
  - 新增 `goToLibrarySurface()`
  - 行为：
    - 非 Tauri 环境直接返回 `false`
    - 如果当前就是主窗口，也返回 `false`
    - 如果当前是独立 reader 窗口，则尝试：
      - 找到 `main` 窗口
      - `show()` + `setFocus()`
      - 关闭当前 reader 窗口

- [`src/lib/services/index.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/services/index.ts)
  - 导出 `goToLibrarySurface`

- [`src/lib/components/reader/ReaderHeaderBar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderHeaderBar.svelte)
  - 将原先的 `Open book` 顶栏按钮改成 `Go to library`
  - 新增 `onGoToLibrary` 回调

- [`src/lib/components/reader/ReaderStage.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte)
  - 新增 `gotolibrary` 事件
  - 把 header 点击转发给 route

- [`src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte)
  - 新增 `handleGoToLibrary()`
  - 先尝试 `goToLibrarySurface()`
  - 如果桌面窗口切换没有接管，再执行 `goto('/library')`

# 关键知识

## 1. 顶栏入口要服务“当前上下文”，不是只复用已有动作

一个按钮能不能复用，不能只看“有没有现成能力”，还要看它所在页面的上下文。

在 reader 里：

- 用户已经打开了一本书
- 当前更常见的目标是回书库，继续选书

所以即使系统已经有“打开文件”的能力，也不代表顶栏这个位置最适合继续放 `Open book`。

## 2. 桌面应用里，“跳页面”和“切窗体”不是一回事

这次之所以没直接写死：

```ts
goto('/library')
```

是因为 `br1` 的 reader 现在已经有独立窗体模式。

对独立 reader 窗口来说，更自然的体验通常是：

- 把用户带回主书库窗体
- 当前阅读窗体退出或退场

这就是为什么这次先尝试 `goToLibrarySurface()`，只在它没接管时才退回普通路由跳转。

## 3. “服务层接管平台差异，route 只做回退”是个好模式

这次的结构其实很值得记住：

- `service` 层知道 Tauri 窗体怎么切
- `route` 层只关心“如果 service 没处理，就走普通导航”

这样好处是：

- 平台逻辑不会散到组件里
- Web / Desktop 可以共存
- 以后如果再补更复杂的窗体行为，也只需要改 service

# 验证

- `pnpm check` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'opens the first library book in a separate reader window'"` (PASS)
- `git diff --check` (PASS)

# 未覆盖项

- 这次没有新增一个专门点击 `Go to library` 的桌面自动化用例
- 如果主窗口不在 `main` 标签或已不存在，目前仍会退回普通路由跳转
- 顶栏的“打开书”能力现在主要保留在 quick-actions 菜单里，没有完全按 Readest 菜单体系重做
