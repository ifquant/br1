# 0044: 让 library 在桌面端优先开独立 reader window

这次补的是窗口模型，不是 reader 内部能力。

你前面指出了一个非常重要的细节：在 macOS 上，`Readest` 打开一本书时，常常不是在原来的 library 窗体里切页面，而是开一个单独的 reader window。这个观察是对的，而且它会直接影响界面应该怎么对齐。

如果窗口模型不对，后面继续压 reader 的视觉，很多工作都会建立在错误前提上。

## 这次做了什么

1. 在 `library` 里拦截“点书/点导入 tile”的打开行为

在 [`BookshelfPreview.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/BookshelfPreview.svelte) 里，原来书卡和导入 tile 都只是普通 `<a href="...">`。

这次新增了：

- `onOpenLink`

如果传了这个回调，就会：

- `preventDefault()`
- 交给外层决定“是普通跳转，还是开 Tauri 新窗”

这样组件本身不需要知道桌面端窗口逻辑，只负责把“用户点了这个 reader 链接”往外抛。

2. 新增 `openReaderTarget()` 服务

在 [`readerWindow.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/services/readerWindow.ts) 里，新加了一个最小窗口服务。

它会：

- 先判断当前是不是 Tauri 桌面环境
- 如果是，就用 `WebviewWindow` 新开窗口
- 否则返回 `false`，让外层继续走普通网页导航

同时会把 URL 补成：

- `?mode=window`

这样 reader route 自己就能知道：  
“我是作为独立阅读窗打开的，不该继续显示主应用壳。”

3. 在全局 layout 里识别 `reader` 独立窗模式

在 [`+layout.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/+layout.svelte) 里，这次新增了：

- `isReaderWindowRoute`

当路径是：

- `/reader`
- 且 `mode=window`

就会隐藏：

- 顶部 app header
- 左侧 workspace rail

这一步很关键。  
因为如果你虽然开了一个新窗，但里面还套着主应用的全局 header 和 side rail，视觉上仍然不像 `Readest` 的阅读窗。

## 你可以学到的具体知识

### 1. 为什么这类逻辑适合放到 service，而不是塞进组件

`WebviewWindow` 是平台能力，不是 UI 组件能力。

如果把它直接塞进 `BookshelfPreview.svelte`，组件就会知道太多事情：

- 当前是不是 Tauri
- 新窗怎么命名
- macOS title bar 怎么配

这会让一个“书卡组件”承担不该属于它的职责。

更稳的做法是：

- 组件只抛“用户想打开 reader”
- service 负责决定“怎么打开”

这就是典型的 **UI 层和平台能力层分离**。

### 2. 为什么独立窗口通常要带一个模式参数

开新窗本身不够，因为同一个路由在不同上下文下往往需要不同壳层。

例如 `/reader`：

- 在主应用里打开时，可能还带整体导航
- 在独立阅读窗里打开时，应该尽量是纯 reader surface

所以这次给新窗 URL 补了：

- `mode=window`

这属于很常见的技巧：  
**同一路由，不同壳层模式。**

比起复制一套 `/reader-window` 路由，这样更轻，也更容易保持能力一致。

## 实际影响

现在 `br1` 在桌面端点书时，已经开始朝 `Readest` 的窗口模型对齐：

- library 里点书
- 优先尝试开独立 reader window
- 新窗里的 reader 会去掉主应用 header 和 side rail

这还是最小版本：

- 还没有用户设置“总是新窗 / 同窗打开”
- 也没有 reader window 复用策略

但窗口模型已经立起来了，后面继续对齐 reader 视觉才不会一直偏。
