# 0007 Add a real reader-engine mount boundary before integrating Foliate

## 背景

前一步已经把 `br1` 的 reader 页面形状对齐到了更像 `Readest` 的结构，但中央正文区还只是普通占位内容。

如果下一步直接把 `foliate-js` 或别的阅读引擎塞进页面里，会很容易出现两个问题：

- DOM-heavy 的阅读逻辑直接侵入页面组件
- toolbar、sidebar、bridge 和阅读引擎之间的边界不清楚

所以这一步先不接引擎本身，而是先把“引擎应该挂在哪里”这件事做成一个明确的工程边界。

## 主要目标

- 给 reader 中央正文区增加独立的引擎宿主组件
- 在 `src/lib/reader/` 下定义轻量的 reader mount 边界常量和类型
- 让后续接 `foliate-js` 时有一个唯一的 mount target，而不是直接往页面里塞 DOM

## 改动概览

- 新增 `ReaderViewport.svelte`，专门承载阅读引擎的宿主区域
- 在 `src/lib/reader/types.ts` 里增加 mount state / boundary 类型
- 在 `src/lib/reader/index.ts` 中导出：
  - `READER_ENGINE_HOST_ATTR`
  - `READER_ENGINE_STATUS_ATTR`
  - `createReaderMountBoundary(...)`
- 更新 `ReaderWorkspace.svelte`，把中央正文区改成“说明文字 + 真正的 reader engine boundary”

## 关键知识

### 1. 接阅读引擎前，先定义 mount boundary，比“先把东西挂上去再说”更稳

像 `foliate-js` 这种阅读引擎，不只是一个普通小组件。

它后面通常会牵出：

- 自己的 DOM 生命周期
- iframe 或内部渲染容器
- 选区、滚动、翻页、注释等事件
- 对外同步阅读进度和状态

如果没有先定义一个稳定的 mount boundary，最容易发生的就是：

- 页面组件直接操作引擎 DOM
- 侧栏或工具栏也顺手开始依赖里面的实现细节
- 最后整个 reader 很难拆，也很难替换实现

所以更稳的方式是先明确：

- 引擎只挂在一个已知宿主容器里
- 其它 UI 通过边界通信，而不是直接侵入容器内部

### 2. `src/lib/reader/` 这种目录的价值，不在“文件多”，而在“谁拥有这块复杂度”

这次把 mount 常量和类型先放进 `src/lib/reader/`，是为了提前声明一件事：

- reader engine 相关复杂度属于 `reader` 域
- 它不应该散落在 route、普通 UI 组件、或者 bridge 组件里

这是一种很实用的复杂度管理方法：

- 当一块能力未来一定会变复杂
- 就先给它一个明确的命名空间
- 让后续新增代码自然往这块聚合

这比后面再从一堆页面代码里反向抽离会轻松很多。

### 3. 占位组件也应该长得像“未来真实接口”，而不是随便放一段文案

这次的 `ReaderViewport.svelte` 不只是一个视觉占位块，它已经在模拟未来真实接入时最关键的信息：

- host role
- engine status
- 中央正文主舞台

这种占位方式更好，因为后续接真实引擎时：

- 很多外层结构可以不变
- 只需要把中间宿主容器从“静态壳”换成“真实引擎挂载点”

也就是说，好的占位不是假装完工，而是在提前塑造正确接口。

## 验证

- `pnpm check` (PASS)

## 未覆盖项

- 这次没有真的接入 `foliate-js`
- 这次没有引入阅读进度、翻页、选区或注释事件
- 这次的 mount boundary 还是静态壳，真正的引擎生命周期管理要放到后续切片
