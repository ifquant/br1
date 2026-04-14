# 0191: 给 reader 初始定位补失败回退语义

## 这次改动解决什么

`Phase 4` 里最重要的一条主线，是把：

- 打开一本书
- 落到正确初始位置

这件事做成正式链路。

之前 `ReaderViewport` 里虽然已经支持：

- `restoreLocation`
- `restoreFraction`

但逻辑是散的：

- 如果有 `restoreLocation`，就直接 `init({ lastLocation })`
- 否则才 `goToFraction(...)`

问题在于，一旦 `restoreLocation` 失败：

- 整次打开会直接走到 error
- 不会再尝试 `restoreFraction`

这会让一些本来还能恢复到大致进度的位置，直接退化成打开失败。

## 这次具体做了什么

### 1. 把初始定位抽成 `applyInitialNavigation()`

文件：`src/lib/components/reader/ReaderViewport.svelte`

这次把“打开书后如何定位到初始位置”从 `openBook()` 主体里抽出来，形成一个独立 helper：

- `applyInitialNavigation()`

这样 `openBook()` 的主线现在更清楚：

1. 打开源
2. 配置 renderer
3. 应用初始定位
4. 进入 `open` 状态

后面继续修 `EPUB` 恢复路径时，就不必在 `openBook()` 里同时读打开逻辑和定位逻辑。

### 2. `restoreLocation` 失败时，自动回退到 `restoreFraction`

文件：`src/lib/components/reader/ReaderViewport.svelte`

`applyInitialNavigation()` 现在的顺序是：

1. 如果有 `restoreLocation`，先尝试 `init({ lastLocation })`
2. 如果这一步失败，打印 warning
3. 自动回退到 `goToFraction(...)`

其中 fraction 的规则是：

- 有有效 `restoreFraction` 且大于 0，就用它
- 否则回到 0

这样就算精确恢复位置失效，reader 仍然会尽量恢复到一个更粗但可用的进度点，而不是整本书直接打不开。

### 3. 把恢复失败从“主打开失败”降级成“定位失败但仍继续打开”

这其实是这次最重要的语义变化。

以前：

- 精确恢复失败
= 可能整次打开失败

现在：

- 精确恢复失败
= 先 warning
= 再用 fraction 回退

这更符合阅读器真实需求，因为对用户来说：

- 能回到接近进度的位置

通常比：

- 因为精确定位坏了而整本打不开

更合理。

## 这次学到的编程知识

### 知识点 1：恢复链路最好有“精确恢复”和“粗恢复”两层

阅读器里的恢复通常不是非黑即白。

比如：

- `CFI` / `locator` / `lastLocation`

属于更精确的恢复方式；

- `fraction`

属于更粗粒度的恢复方式。

如果系统已经有粗恢复手段，那更稳的策略通常是：

- 先试精确恢复
- 失败后再退到粗恢复

而不是把精确恢复失败直接升级成整次打开失败。

### 知识点 2：把“打开”和“定位”拆开，有助于后续排障

如果一个函数同时负责：

- 打开书
- 配 renderer
- 恢复位置

那一旦失败，就很难第一眼判断到底是哪一步坏了。

把 `applyInitialNavigation()` 单独抽出来之后，后面调试时就更容易回答：

- 是书没打开
- 还是书打开了，但恢复没落对地方

## 这次没有处理什么

- 没有直接修 `EPUB` 的几何错位问题
- 更激进的 `EPUB` 恢复回归在当前本地环境仍未通过
- 没有改 `foliate-js` deeper integration，只收口了初始定位语义
