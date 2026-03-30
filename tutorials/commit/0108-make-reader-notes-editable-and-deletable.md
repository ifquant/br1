# 0108：让 reader notes 从“能记”升级到“能维护”

上一个切片把 notes 从 placeholder 变成了最小可用能力，但如果笔记不能改、不能删，很快就会变成一次性草稿堆。

这次只做一件事：把当前 notes 链补到最小可维护状态。

## 这次做了什么

1. 在 [/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte) 增加：
   - `editNote(id)`
   - `deleteNote(id)`
2. 编辑继续沿用最小输入方式：
   - 用 `prompt()` 修改 note 文本
3. 删除也保持最小实现：
   - 用 `confirm()` 二次确认
4. 在 [/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte) 给每条 note 加操作位：
   - `编辑`
   - `删除`

## 为什么这一步先不做复杂弹窗

现在目标不是做一整套 annotator UI，而是先验证数据链：

- note 能新增
- note 能编辑
- note 能删除
- note 不会和“点击 note 回跳正文”冲突

只要这条链成立，后面把 `prompt/confirm` 换成更完整的 panel 或 modal 会很自然。

## 这次可以学到的两个点

### 1. 让 route 持有可变数据，组件只负责触发动作

`ReaderSidebar` 现在只是：
- 展示 notes
- 发出 `编辑 / 删除 / 打开` 意图

真正修改 `notes` 数组和 `localStorage` 的还是 route。  
这样组件不会一边渲染一边自己偷偷改状态，边界会更稳。

### 2. “整行主动作 + 内层次动作” 的事件设计要先想清楚

这里一条 note 同时有：
- 点击整条回跳原文
- 点击 `编辑`
- 点击 `删除`

如果结构混乱，很容易出现“点编辑结果跳转了”这种交互 bug。  
所以这次把 note 分成：
- `note-link`：主动作
- `note-actions`：次动作

这比把所有按钮都塞进一个可点击容器里更稳。

## 实际验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## 这次没做的

- 还没有 inline 编辑器
- 还没有批量删除或撤销删除
- 也还没有把删除动作同步到更正式的 annotations store
