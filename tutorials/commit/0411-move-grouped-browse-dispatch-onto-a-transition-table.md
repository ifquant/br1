# 0411 - 把 grouped browse 的 dispatch 收成 transition table

## 背景

上一刀已经给 grouped browse 加上了 typed action dispatch：

- route 发 `LibraryBrowseAction`
- navigation module 根据 action 产出下一跳 `LibraryBrowseState`

但 dispatch 本身还是一串 `if/else`：

- `enter-group`
- `exit-group`
- `jump-trail`
- `enter-from-trail`
- `switch-sibling`

这比 page 里散着调 helper 已经好很多，但从设计上看，它还不够像真正的导航系统。

## 这次做了什么

这次没有改 UI，而是继续把 grouped browse 的内部边界往上抬：

1. 给 `LibraryBrowseAction` 建了一套显式 transition handler map
2. 把 `action.type -> transition handler` 的关系收成 table，而不是 `if/else`
3. 新增一个内部 `dispatchLibraryBrowseAction(...)` 来统一走这张 table
4. `getNextLibraryBrowseState(...)` 现在只负责把当前 state 和 action 交给 transition table

## 为什么这一步重要

### 1. dispatch 终于从“分支代码”变成“规则表”

`if/else` 的问题不是不能用，而是它会让导航规则继续长在流程代码里。

transition table 更接近在说：

- 这里有哪些动作
- 每个动作对应哪条状态变换规则

这让 grouped browse 的导航规则开始具备“显式可枚举”的结构，而不只是“某段函数里碰巧写出来的一串判断”。

### 2. 这一步比直接喊 state machine 更实在

现在这个系统还没有：

- guard 条件建模
- side effect orchestration
- 明确的 terminal / invalid states

所以把它直接叫成 state machine 会过头。

更准确的说法是：  
它开始有了 **state-machine 风格的 transition table**。

这一步足够真实，也为后面继续演进留了空间。

### 3. 后面再扩 action 时，不会继续把 dispatch 逻辑弄脏

如果后面还要加入新的 grouped browse 动作，最合理的扩展点应该是：

- 新增 action 类型
- 把它注册进 transition table

而不是继续回到一串越来越长的 `if/else`。

这就是这刀真正的收益。

## 结果

现在 grouped browse 的共享边界已经变成：

- 推导模型
- route codec
- transition helpers
- typed action dispatch
- transition table

也就是说，library route 已经进一步远离“自己懂导航规则”的状态，而 navigation module 则越来越像一个独立的 browse-state subsystem。

## 验证

- `pnpm check`（PASS）
- `git diff --check`（PASS）

## 未覆盖项

- 这次没有补 dedicated tests 去验证 transition table 的动作覆盖
- grouped browse 仍然没有正式 guard/invalid-state 建模
- 这还不是完整 state machine，只是更明确的 transition-table 结构
