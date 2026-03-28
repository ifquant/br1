# 0030 Prepare reader host for foliate-js

## 背景

`reader` 的壳层已经基本摆正了，接下来就该进入真正的引擎接入准备。

但这一步仍然不应该一口气去做：

- 打开书
- 翻页
- 位置恢复
- TOC 联动

更稳的第一刀是先回答一个更底层的问题：

- `foliate-js` 能不能在当前 reader host 里被正确加载、注册、并挂上宿主元素？

所以这一步做的是“把引擎宿主边界打通”，不是“把阅读能力一次做完”。

## 主要目标

- 为 `foliate-js/view.js` 建立一个明确、最小的 adapter 边界
- 在 `ReaderViewport` 里验证 `foliate-view` 能被动态导入并挂载
- 补齐当前本地依赖缺失的 TypeScript 声明

## 改动概览

- 新增 `src/lib/reader/foliate.ts`
  - 提供 `ensureFoliateViewDefinition()`
  - 提供 `createFoliateViewElement()`
- 更新 `src/lib/reader/index.ts`
  - 统一导出 `foliate` adapter 入口
- 更新 `src/lib/components/reader/ReaderViewport.svelte`
  - `onMount` 时动态导入 `foliate-js/view.js`
  - 在 host 里挂一个 `foliate-view` 宿主元素
  - 用一个本地 `adapterStatus` 展示宿主准备状态
- 新增 `src/lib/types/foliate-js.d.ts`
  - 为 `foliate-js/view.js` 补最小模块声明

## 关键知识

### 1. “先打通宿主边界”比“先写 open()”更稳

接阅读引擎时，一个常见误区是：

- 一上来就想把 `open()`、`goTo()`、TOC、位置恢复都连起来

但如果你连最基本的宿主边界都还没验证，后面很难分清问题到底出在哪：

- 是 import 失败
- 是 custom element 没注册
- 是 host 放错位置
- 还是 book 打开逻辑本身有问题

所以更稳的顺序 usually 是：

1. 先确认 `view.js` 能被动态导入
2. 先确认 `foliate-view` 能注册
3. 先确认 host 里能挂上这个元素
4. 再继续做 `open()` 和导航

这一步做的正是这前三件事。

### 2. 对不带类型声明的本地 ESM 依赖，最小 `.d.ts` 是一种很实用的过渡手法

这一步真正遇到的报错不是运行时，而是 TypeScript：

- `Could not find a declaration file for module 'foliate-js/view.js'`

这很正常，因为你现在依赖的是本地 `foliate-js` 仓库，它没有给这个入口准备 TS 声明。

这种情况下，如果你只是先想把边界打通，一个很实用的办法是：

- 先补一个最小声明文件

例如：

- `declare module 'foliate-js/view.js';`

这样做的价值是：

- 不会为了类型问题卡死整个接入节奏
- 先让真实模块边界能跑起来
- 后面再慢慢补更精细的类型

### 3. 动态导入第三方阅读引擎时，把状态显式写出来，比静默挂载更好排错

这一步没有静默做：

- import 成功就算了

而是加了一个本地 `adapterStatus`：

- `idle`
- `loading`
- `ready`
- `error`

这样做的好处是：

- 你一眼就知道现在卡在什么阶段
- 如果后面引擎挂载失败，排错会直接很多

这类状态变量在“重型第三方接入”里很值，因为它能把原本模糊的失败变成可见阶段。

## 验证

- `pnpm check` (PASS)

## 未覆盖项

- 这次没有打开真实书籍，也没有调用 `view.open()`
- 这次没有接 TOC、位置恢复、翻页或 bridge 联动
- 这次只把 `foliate-view` 的注册和宿主挂载边界打通
