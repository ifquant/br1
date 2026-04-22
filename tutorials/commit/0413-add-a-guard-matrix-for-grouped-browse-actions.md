# 0413 - 给 grouped browse 加一层 guard matrix

## 背景

上一刀已经让 grouped browse 的 transition result 变成了显式协议：

- `applied`
- `noop`
- `invalid`

但 invalid 的来源还主要藏在 transition handler 里。  
也就是说，系统虽然知道“这次跳转无效”，却还没有一层独立的“动作是否可用”判断面。

## 这次做了什么

这次继续把 grouped browse 的导航语义往前拆：

1. 在 [`src/lib/library/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/types.ts) 新增 `LibraryBrowseActionGuardResult`
2. 在 [`src/lib/library/navigation.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/navigation.ts) 新增一张按 action type 建的 guard map
3. 新增 `getLibraryBrowseActionAvailability(...)`
4. `getNextLibraryBrowseState(...)` 现在先看 guard，再决定是否进入 transition table
5. guarded trail actions 不再自己在 transition handler 里重复处理“segment 存不存在”这类前置条件

## 为什么这一步重要

### 1. action availability 终于从 transition 执行里分离出来

一个更像样的导航系统，不应该只会说“执行后得到什么结果”，还应该能回答：

- 这个动作在当前状态下可不可以做

这次补的就是这层问题。

现在 grouped browse 不再只有 transition table，也开始有独立的 guard matrix。

### 2. 这让 invalid 不再只是失败结果，也成为前置条件结果

以前 invalid 更像执行时失败。

现在 invalid 的来源可以更明确地说成：

- 先看 guard
- guard 不通过
- 所以这次 action 是 blocked

这会让后面不管是：

- route
- header
- navigator
- ancestor landing

都更容易共享“哪些动作当前可用”的同一套判断，而不是每层都自己猜。

### 3. 这比直接上完整状态机更稳

现在还没有必要强上完整 state machine 框架。

更稳的路径是：

1. 先把 action 明确
2. 再把 transition table 明确
3. 再把 result 明确
4. 再把 guard matrix 明确

这刀就是第 4 步。  
它让 grouped browse 已经具备了更清楚的导航语义骨架。

## 结果

现在 grouped browse 的共享导航层已经具备：

- browse state
- browse action
- action guard matrix
- transition table
- structured transition result

这意味着 `br1` 的 grouped library browse 已经越来越不像“页面里一组被抽出来的 helper”，而越来越像一个可扩展的导航子系统。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- 这次还没有把 guard availability 直接接到 UI 上做 disabled/hidden 策略
- guard reason 目前仍然只覆盖当前 trail-segment 缺失这类前置条件
- grouped browse 仍然不是完整 state machine，只是已经具备更完整的 guard + transition 骨架
