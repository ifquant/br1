# 0047: 给 Tauri 显式放开创建 reader window 的权限

这次修的不是前端样式，而是一个很典型的桌面应用权限问题。

前面我们已经在前端代码里加了：

- 点击书卡时优先开独立 reader window
- 用 `WebviewWindow` 创建新窗口

但如果 Tauri capability 没有放开对应权限，那么前端代码即使写对了，也会在真正调用时失败，然后退回到原来的单窗体跳转。

这正好会表现成你看到的问题：

- 点书后还是在原窗体打开
- 好像没有新建窗体

## 这次做了什么

在 [`src-tauri/capabilities/default.json`](/Users/dev/workspace2/hc_apps/br1/src-tauri/capabilities/default.json) 里，新增了：

- `core:webview:allow-create-webview-window`

也就是说，主窗口现在被明确允许：

- 创建新的 `WebviewWindow`

这一步是前端窗口逻辑真正生效的前提。

## 你可以学到的具体知识

### 1. 为什么“代码已经写了”不代表桌面能力就真的能用

在 Tauri 2 里，很多桌面能力不是“只要 import 了 API 就能直接调用”，而是还受 capability 控制。

这意味着两个条件都要满足：

1. 前端代码正确调用 API  
2. capability 显式允许这类操作

少一个都不行。

这和普通 Web 开发很不一样，因为浏览器页面通常没有这种“应用级权限清单”。

### 2. 为什么这个问题会表现成“看起来像前端逻辑没生效”

因为我们的打开流程本身就做了 fallback：

- 先尝试新建 reader window
- 如果失败，再退回原来的路由跳转

这样用户看到的结果就会像：

- “点书后还是在原窗体”

但真正的根因未必是点击逻辑错了，也可能是：

- 桌面新窗创建权限没放开

这类问题的难点就在这里：  
**症状发生在 UI，根因却在桌面能力配置。**

## 实际影响

现在 `br1` 的主窗口已经被允许创建新的 reader window。  
这意味着前面已经写好的：

- `openReaderTarget(...)`
- `WebviewWindow(...)`
- `mode=window`

这整条路径终于有机会在 Tauri 桌面端真正生效。
