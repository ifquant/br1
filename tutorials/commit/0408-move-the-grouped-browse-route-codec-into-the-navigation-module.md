# 0408 - 把 grouped browse 的 route codec 也并进 navigation module

## 背景

上一刀已经把 grouped browse 的推导语义抽进了 [`src/lib/library/navigation.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/navigation.ts)。

但 route 里还留着最后一段关键逻辑：

- `groupBy` 怎么解析
- `group` 怎么解析
- `trail` 怎么解析
- 下一次跳转的 href 怎么拼

也就是说，模型虽然已经抽出来了，状态语义还没有完全抽出来。

## 这次要补什么

这次把 grouped browse 的 route codec 也并进同一个 navigation module：

1. 在 `navigation.ts` 里新增 `LibraryBrowseState`
2. 新增 `getLibraryBrowseStateFromUrl(...)`
3. 新增 `buildLibraryBrowseHref(...)`
4. 把 `normalize/parse/serialize` 这些 URL codec helper 全部从 route 里移走
5. route 的 `syncLibraryBrowseLocation(...)` 改成只调用 navigation module 来生成 href

## 为什么这一步重要

### 1. 没有 codec，navigation model 还不算完整

如果 grouped browse 的“推导”在 navigation module 里，但 grouped browse 的“状态编解码”还在 route 里，那么它仍然是半抽离状态。

真正完整的 navigation model 至少要能回答两件事：

- 当前状态是什么
- 下一个状态对应的 URL 是什么

这次补的就是后半部分。

### 2. route 终于不再解释 grouped browse 的状态语义

现在 route 只做两件事：

- 从 navigation module 读当前 browse state
- 把下一步 browse state 交回 navigation module 生成 href

这说明 route 已经从“自己懂 grouped browse”退到了“消费 grouped browse”。

### 3. 这为更正式的 graph/state 演进扫掉最后一层 page-local 边界

如果后面要继续往：

- 更明确的 graph object
- 更统一的 state transitions
- 更独立的 library navigation store

推进，这批 URL codec 如果还留在 route 里，就会一直是阻力。  
这一刀把这层阻力提前清掉。

## 结果

现在 `br1` 的 grouped browse 已经不只是：

- UI 上有 navigator
- 逻辑上有 navigation model

而是进一步变成：

- route state 的解析也归 navigation module
- route state 的序列化也归 navigation module

这让 grouped browse 更接近一个完整的导航子系统，而不是一堆已经拆开的 helper。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- 这次没有补 dedicated e2e 去断言新的 route codec 边界
- navigation module 目前仍然是函数集合，不是更正式的 state machine
- 还没有继续把 grouped browse 的 transition rules 统一抽成显式 command API
