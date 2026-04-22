# 0412 - 给 grouped browse 加显式 guarded transition results

## 背景

上一刀已经把 grouped browse 的 dispatch 收成了 transition table。

但还有一个不够像正式导航系统的地方：

- 有些动作能成功产生下一跳
- 有些动作其实什么都没变
- 有些动作在当前状态下根本无效

之前这三类情况没有被清楚地区分。  
尤其是像 trail jump / enter-from-trail 这种带索引的动作，守卫失败时只是返回 `null`，等于把 invalid transition 静默吞掉。

## 这次做了什么

这次把 grouped browse 的 dispatch 结果从“一个 state 或者 `null`”升级成了显式结果类型：

1. 在 [`src/lib/library/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/types.ts) 新增 `LibraryBrowseTransitionResult`
2. 新增三种结果语义：
   - `applied`
   - `noop`
   - `invalid`
3. 给 invalid 情况补了显式 `reason`
4. transition table 里的 guarded 动作不再返回 `null`，而是返回结构化 invalid result
5. route 现在只在 `applied` 时真正同步 URL

## 为什么这一步重要

### 1. guard 终于变成模型的一部分

以前的 guard 只是“函数里 return null”。

现在 guard 变成了显式状态语义：

- 这是成功跳转
- 这是无变化动作
- 这是无效动作

这对一个导航系统来说，差别很大。  
因为“没有下一跳”不再只是实现细节，而是一个被建模的结果。

### 2. 这让 transition table 不再只有 happy path

如果一张 transition table 只能描述“动作成功时怎么办”，那它还不完整。

真正更接近 state-machine 风格的地方在于：

- 不只定义成功转移
- 也开始定义无效转移和无变化转移

这刀补的就是这层语义。

### 3. route 不再需要把 `null` 当成隐式协议

之前 page 要靠：

- 调 helper
- 看是不是 `null`
- 默默跳过

现在它收到的是一个更明确的协议对象。  
哪怕当前 UI 还只是对 `invalid / noop` 选择“不跳转”，这层边界也已经清楚很多。

## 结果

现在 grouped browse 的共享导航层已经具备：

- state
- action
- transition table
- guarded transition result

也就是说，`br1` 的 grouped browse 已经开始从“共享 helper 集合”往“有明确转移结果语义的导航子系统”走。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- 这次没有把 invalid / noop 结果进一步挂到用户可见反馈上
- invalid reason 目前仍然很少，只覆盖了当前 trail-guard 失败场景
- grouped browse 还没有完整的 guard matrix，也还不是正式 state machine
