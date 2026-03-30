# 0109：通过 foliate annotations 把 note 高亮真正画回正文

这次改动解决的是一个很具体的问题：

- 之前 note 已经能新增、编辑、删除
- 但它只是 sidebar 里的数据
- 正文里看不到 note 对应的高亮

这会让笔记系统始终像“旁路数据”，不像真正长在阅读器里的 annotation。

## 这次做了什么

1. 在 [/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte) 里接入 `foliate-view.addAnnotation(...)`
2. 给 notes 使用固定前缀：

```text
foliate-note:<cfi>
```

3. 用 `draw-annotation` 事件把 note 画成固定样式的高亮
4. 在切书和 notes 变化时，同步增删 annotation，避免旧书的高亮残留到新书

## 为什么这样更像 Readest

`Readest` 的 annotator 不是“sidebar 自己画一个列表就算了”，而是：
- sidebar 持有笔记数据
- view 负责把 annotation 真正画到正文上

这次我们走的是同一类思路，只是先做了最小版：
- 不做多颜色
- 不做复杂 annotation 类型
- 先让 note 能在正文里被看见

## 这次可以学到的两个点

### 1. “列表数据” 和 “阅读器可视化覆盖层” 应该分开

`notes` 本身是数据。  
正文里的高亮不是再存一份新数据，而是把已有 note 投影成 annotation。

这类结构很常见：
- store 负责持久化
- renderer 负责可视化

### 2. 切书时一定要清掉旧 annotation 的同步状态

如果只是“新书继续 addAnnotation”，而不重置上一本书的 annotation 状态，  
就很容易出现：
- 旧书高亮残留
- 当前书和上一本书的 overlay 状态串线

所以这次在 `openBook(...)` 时显式清掉 `syncedNoteValues`，就是为了避免这种跨书污染。

## 实际验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## 这次没做的

- 还没有多种高亮颜色
- 还没有点击正文高亮后反查并定位到 sidebar 的 note
- 也还没有把 notes 提升成更正式的 annotation store
