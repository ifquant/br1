# 0410 - 给 grouped browse 加一层 typed action dispatch

## 背景

上一刀已经把 grouped browse 的 transition rules 抽进了 [`src/lib/library/navigation.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/navigation.ts)。

但 route 里其实还留着一层不够干净的耦合：

- 点击 group card 时，route 知道该调 `enter`
- 点击返回时，route 知道该调 `exit`
- 点击 breadcrumb 时，route 知道该调 `jump`
- 点击 ancestor landing 时，route 知道该调 `enterFromTrail`
- 点击 sibling graph 时，route 知道该调 `switchSibling`

也就是说，page 已经不直接改状态了，但还在自己决定“该选哪一个 helper”。

## 这次做了什么

这次继续把这层选择逻辑往 navigation module 收：

1. 在 [`src/lib/library/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/types.ts) 新增 `LibraryBrowseAction`
2. 在 [`src/lib/library/navigation.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/navigation.ts) 新增 `getNextLibraryBrowseState(current, action)`
3. 让 route 只发动作，而不是自己挑 transition helper
4. page 侧新增 `dispatchLibraryBrowseAction(...)`，统一把 action 变成下一跳 state 再同步回 URL

## 为什么这一步重要

### 1. route 终于开始表达“意图”，而不是“实现路径”

现在 page 说的是：

- `enter-group`
- `exit-group`
- `jump-trail`
- `enter-from-trail`
- `switch-sibling`

而不是：

- 调哪个 helper
- 哪个 helper 接哪些参数
- 哪个 helper 会不会返回 `null`

这让 route 更像导航消费者，而不是导航编排者。

### 2. transition layer 开始长成真正的 API

上一刀的 transition helpers 还是“函数集合”。

这一刀之后，grouped browse 已经有了更明确的调用边界：

- `state` 是当前导航状态
- `action` 是发生的导航意图
- `nextState` 是统一 dispatch 后得到的结果

这虽然还不是完整 state machine，但已经明显比“在 page 里散着调一组 helper”更接近正式导航系统。

### 3. 后续再继续演进时，route 不需要再跟着改一串 handler

如果后面要继续加：

- 更正式的 action schema
- 更明确的 graph navigation
- 可复用的 library navigation store

那么 route 这一层最好已经只认 action，而不是认一长串底层 helper。

这一刀先把这个边界立起来，后面演进就更顺。

## 结果

现在 grouped browse 的共享边界已经进一步完整了：

- 推导模型在 `navigation.ts`
- route codec 在 `navigation.ts`
- transition rules 在 `navigation.ts`
- action dispatch 也在 `navigation.ts`

于是 [`src/routes/library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 的 grouped browse 逻辑进一步退化成：

- 读取当前 state
- 发一个明确 action
- 同步下一跳 URL

这比之前“page 还要挑 helper”更接近真正独立的 navigation subsystem。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- 这次没有补 dedicated tests 去直接断言 action dispatch 语义
- dispatch 目前仍然是一个纯函数入口，还不是显式状态机
- grouped browse 仍然主要是 trail + sibling graph，并没有演进成更完整的多维 browse protocol
