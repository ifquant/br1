# 0409 - 把 grouped browse 的 transition rules 也抽进 navigation module

## 背景

上一刀已经把 grouped browse 的 route codec 并进了 [`src/lib/library/navigation.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/navigation.ts)。

但 library route 里其实还剩最后一类“真正懂导航语义”的代码：

- 进入一个 group 时，trail 怎么增长
- 退出当前 group 时，上一层怎么恢复
- 从 pivot 跳转时，应该复用哪条规则
- 点 breadcrumb 时，状态应该裁到哪一层
- 从 ancestor landing 继续往下钻时，trail 应该截到哪里
- 在 sibling group 之间横跳时，哪些父层上下文应该保留

这些都不是 UI 细节，而是 grouped browse 的 transition rules。

## 这次做了什么

这次把这组 transition rules 也从 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 抽进了 shared navigation module：

1. 新增 `getLibraryEnterBrowseState(...)`
2. 新增 `getLibraryExitBrowseState(...)`
3. 新增 `getLibraryJumpTrailState(...)`
4. 新增 `getLibraryEnterFromTrailState(...)`
5. 新增 `getLibrarySiblingBrowseState(...)`
6. route 侧的 handler 改成只组装当前 state，然后调用这些 shared helpers

## 为什么这一步重要

### 1. route codec 抽出来以后，真正剩下的核心就是 transition

如果 URL codec 已经共享，但“进入 / 退出 / 横跳 / 回跳”这些状态变化规则还写在 route 里，那么 route 依然在定义 grouped browse 的本体。

也就是说，之前的 navigation module 还只是：

- 会解释状态
- 会推导展示

但还不会决定“下一个状态是什么”。

这一刀补的就是这块。

### 2. pivot、breadcrumb、ancestor、sibling 终于开始共用同一套状态规则

在 UI 上，这些入口看起来是不同动作：

- pivot 是 overview band 里的相关跳转
- breadcrumb 是 header 里的祖先回跳
- ancestor landing 是正文里的上层继续浏览
- sibling graph 是同层横向切换

但从 navigation model 的角度看，它们都只是“从当前 browse state 走到另一个 browse state”。

把规则抽到 shared helper 之后，route 不再各写一套局部逻辑，之后如果要改 trail 语义，只需要改一处。

### 3. 这让 grouped browse 更像一个独立导航子系统

现在 grouped browse 已经有了三层共享边界：

- 推导模型在 `navigation.ts`
- route codec 在 `navigation.ts`
- transition rules 也在 `navigation.ts`

这意味着 library route 进一步退化成：

- 读取当前 browse state
- 在用户动作发生时请求下一个 browse state
- 把结果同步回 URL

这比“页面自己维护一套 grouped browse 规则”要更接近真正可复用、可演进的导航系统。

## 结果

这次没有新增一个新的可见 UI，但把 grouped browse 的最后一块 page-local 语义继续收掉了。

现在 `+page.svelte` 不再自己决定：

- enter 怎么扩 trail
- exit 怎么退层
- jump 怎么裁 trail
- sibling switch 怎么保留父层上下文

这些都已经进入 shared navigation module。

这让后续继续往更正式的 state machine 或 graph navigation 演进时，已经不需要再先拆 route 里的局部规则。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- 这次没有补 dedicated e2e 去单独断言 transition helper 本身
- navigation module 目前仍然是一组纯函数，还不是显式的 state machine
- grouped browse 仍然主要是线性 trail + sibling graph，还没有演进成更完整的树/图浏览协议
