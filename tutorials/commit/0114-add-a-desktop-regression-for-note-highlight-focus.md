# 0114 为笔记高亮聚焦补一条桌面回归

这次提交没有继续加新功能，而是把已经存在的 notes 行为锁进桌面自动化里：当正文里的笔记高亮被激活时，reader 应该自动切到 `笔记` 面板，并把对应 note 卡片高亮出来。

## 为什么要这样做

前面 notes 这条链已经有两个方向：

- 点 sidebar note，回跳正文
- 点正文里的 note 高亮，反向聚焦 sidebar

第二条链如果只靠手工验证，很容易以后被窗口切换、reader 重新打开、notes hydration 时序这些小问题悄悄弄断。所以这次不是继续猜，而是把它直接写成桌面回归。

## 这次具体做了什么

1. 在 [e2e/app.e2e.ts](/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts) 里抽出 `reopenReaderWithLegacyNote()`
   这条 helper 复用了已经证明稳定的 legacy-note 迁移路径：
   - 打开一本书
   - 清空当前书旧 notes
   - 从 `localStorage` 预埋一条 legacy note
   - 关闭 reader
   - 重新打开同一本书
   - 等宿主 notes store 接管并在 sidebar 渲染出来

2. 让原来的 notes migration 回归复用这条 helper
   这样旧回归和新回归共享同一条准备链，不会出现一条改了、另一条忘了同步。

3. 新增桌面回归
   - 先确保 note 已经出现在 `笔记` 面板
   - 再切回 `目录`
   - 然后手动派发 `show-annotation`
   - 最后断言：
     - `笔记` tab 被自动选中
     - 对应 `.note-card` 带有 `active-note`

## 这次对应的知识点

### 1. 抽测试 helper 的价值不只是“少写几行”

当两条回归共享同一段复杂前置条件时，最危险的不是重复，而是**重复后的漂移**。  
这次之前的问题就是：

- notes migration 那条链是绿的
- 新加的高亮聚焦回归自己又拷了一份“种 note -> 关窗 -> 重开”
- 两份逻辑稍一分叉，就会出现“旧用例绿，新用例红，但产品其实没坏”

把准备链抽成 helper，能让失败更接近真实根因，而不是测试自身时序漂移。

### 2. UI 自动化里，先锁“数据准备链”，再测“交互链”

这次新回归没有一上来就直接测高亮聚焦，而是先确保：

- note 真的被 reader 读到了
- notes panel 真的能渲染出对应卡片

只有前置条件成立后，再去测 `show-annotation -> notes focus`。  
这是一种很重要的自动化写法：**把失败切分成更小的阶段**，这样红灯才更有诊断价值。
