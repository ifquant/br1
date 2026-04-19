# 0285: cover reader settings reopen through the desktop FB2 flow

上一刀已经把新的 reader settings reopen 证据补到了 `EPUB` desktop 主路径，但那还不够。

原因很直接：

- `EPUB` 是主格式
- `FB2` 是 secondary format

如果 settings 只在 `EPUB` 上成立，那 `P0-2` 仍然更像“主格式完成”，还不是“阅读系统开始跨格式成立”。

所以这次补的是：

- 不新增功能
- 不改 settings contract
- 只把现有 desktop reopen 证据从 `EPUB` 推进到 `FB2`

## 为什么这一刀有意义

`FB2` 在 `br1` 里已经不是“只是能打开”的格式了。

前面几轮已经把它补到了：

- import/open/reopen
- metadata import
- annotation persistence
- highlights workspace

那下一步就应该问一个更像产品面的问题：

> 同一套阅读设置，在 `FB2` 这种 secondary format 上，能不能和主格式一样穿过真实 reader reopen？

如果不能，那说明 settings 还只是某条主格式路径的偶然成功。

## 做了什么

改动点仍然只有：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

我没有新建一条单独的 `FB2 settings` spec，而是继续挂在现有这条主路径上：

- `persists FB2 highlights and notes separately through the desktop reader store`

这和上一刀的思路一样：

- 不做孤立小测试
- 直接把 settings reopen 证据叠加到真实 reader workflow 上

### 新增的流程

在 `FB2` desktop regression 里，保存完第一组 saved highlight selection 之后，新增：

1. 用 `More actions` 菜单切到：
   - `滚动`
   - `无衬线`
   - `大`
   - `舒展`
   - `宽`
2. 直接读 renderer 状态，确认：
   - `flow === scrolled`
   - `margin-left === 44px`
   - `fontSize === 22px`
   - `lineHeightPx > 42`
   - `fontFamily` 包含 `IBM Plex Sans`
3. 关闭 reader window
4. 从 library 重新打开同一本 `FB2`
5. 进入 `高亮` tab
6. 再次确认：
   - settings 还在
   - highlights workspace 的 `selected-only + oldest-first` 状态也还在

这样证明的是：

- `FB2` 上的 foliate-backed surface 真吃到了 settings
- 这些设置不只是当前窗口内有效
- 它们能和现有 workspace 状态一起恢复

## 为什么这里仍然断言 `44px`

和 `EPUB` desktop 一样，这里断言的是：

- window mode
- `standard width`
- `wide margins`

这个组合在当前实现里的真实值就是 `44px`。

所以这里不是“抄上一条测试”，而是确认 `FB2` 通过相同 settings contract 时，表现和 `EPUB` desktop 一致。

## 结果

现在 `P0-2` 的 desktop settings reopen 证据至少已经覆盖：

- `EPUB`
- `FB2`

这比只靠主格式更像真正的 reader system 证据。

## 还没做什么

这一步之后，settings reopen 仍然没有完整覆盖：

- `MOBI`
- `AZW3`
- `TXT`

所以审计表里 `Scroll/Page View Modes` 和 `Customize Font and Layout` 仍然是 `Partial`，只是“desktop reopen evidence”这层已经从单一主格式推进到了主格式 + secondary format。

## 你可以学到什么

### 1. secondary format 的价值不只是“能打开”

很多项目做 secondary format 时，容易满足于：

- 能导入
- 能打开
- 有一条 smoke

但真正要收产品面时，更重要的是问：

- 它能不能吃同一套 settings？
- 能不能穿过同一条 reopen 工作流？
- 能不能和已有 workspace 状态共存？

这次补的就是这种更高一级的证据。

### 2. 最好的回归不是越来越多，而是越来越接近真实工作流

单独做一个“FB2 settings reload”小测试当然也行。

但把它挂在已有的 `FB2 annotations + highlights + reopen` 主路径上更值钱，因为这能同时证明：

- settings
- renderer
- reopen
- workspace state

这些状态没有互相打架。
