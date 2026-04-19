# 0284: cover reader settings reopen through the desktop EPUB flow

上一提交把 `ReaderSettings` 模型和 `scroll / paginated` 切换真正接进了 reader，但那时证据主要还是 web reload。

这次补的是更值钱的一层：

- 不是页面 reload
- 而是桌面 reader window 真正关闭再重开

也就是更接近用户实际使用的 reopen 路径。

## 为什么这一刀要单独补

如果只证明 web reload 能恢复设置，仍然会留下一个很实际的问题：

- 桌面 reader 是单独窗口
- 用户真正的工作流是 `library -> reader window -> close -> reopen`

所以对 `P0-2` 来说，settings 如果不能穿过这条桌面 reopen 链，就还不能算真的进入产品状态。

## 做了什么

改动点只有一个：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

我没有新开一条独立的 settings spec，而是直接把现有最强的主路径：

- `persists epub highlights and notes separately through the desktop reader store`

继续往前扩。

这样做的好处是，新的 settings reopen 证据不会脱离真实 reader 工作流，而是叠加在一条已经证明：

- EPUB 能打开
- highlights/notes 能持久化
- highlights workspace 状态能恢复

的桌面主路径上。

### 具体补的断言

在 EPUB desktop regression 里新增了这段流程：

1. 进入 reader `高亮` tab
2. 通过 `More actions` 菜单切到：
   - `滚动`
   - `无衬线`
   - `大`
   - `舒展`
   - `宽`
3. 直接读取 desktop renderer 的真实状态，确认：
   - `flow === scrolled`
   - `margin-left === 44px`
   - `fontSize === 22px`
   - `lineHeightPx > 42`
   - `fontFamily` 包含 `IBM Plex Sans`
4. 关闭 reader window
5. 从 library 重新打开同一本书
6. 再次进入 `高亮` tab
7. 继续确认两层状态都回来：
   - reader settings 还在
   - highlights workspace 的 `selected-only + oldest-first` 状态也还在

这个组合断言很重要，因为它证明的不是“settings 单独能保存”，而是：

- settings reopen
- workspace reopen

能同时成立，不互相踩。

## 为什么这里的 margin 断言是 `44px`

这次中间还踩到一个很典型的小坑：

- web 用例里 `wide margins` 的断言是 `52px`
- 但 desktop window mode 下，`standard width + wide margins` 的真实值是 `44px`

原因在于 `ReaderViewport` 的 margin 计算对：

- web
- window mode
- width mode
- pageMargins

用了不同组合逻辑。

这也是为什么这类测试不能只从 web smoke 推 desktop 结论，必须分别断言真实值。

## 结果

现在 `P0-2` 至少已经有两层证据：

1. web reload 证据
2. desktop reopen 证据

而且 desktop 证据不是孤立小测试，而是挂在现有 EPUB 主工作流上。

## 还没做什么

这一步仍然不是 `P0-2` 收口：

- 还没有把同等级 reopen 证据补到 `FB2/MOBI/AZW3/TXT`
- 还没有给 settings 单独做更完整的 regression matrix
- 还没有把 sidebar/header/footer 的更深层几何契约一起收齐

所以审计表里：

- `Scroll/Page View Modes`
- `Customize Font and Layout`

仍然是 `Partial`。

但现在已经不是“只有 web 侧一个证明”，而是开始有桌面真实 reopen 路径的证据。

## 你可以学到什么

### 1. 对桌面应用来说，reload 证据不等于 reopen 证据

浏览器里很多状态会因为同源 storage 看起来“保存了”。

但真正到桌面 reader window，用户操作的是：

- 关窗
- 重新打开

所以 settings 这类产品状态，最终必须至少补一条真实 reopen 证据。

### 2. 高价值回归最好挂在现有主路径上

如果新开一条只验证 settings 的小测试，当然也能跑。

但把它挂在现有 EPUB desktop 主路径上更值钱，因为这样你能确认：

- settings
- annotations
- highlights workspace
- reopen flow

这些状态不会互相打架。
