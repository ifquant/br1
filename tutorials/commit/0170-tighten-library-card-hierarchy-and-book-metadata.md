# 0170 收紧 library 卡片层级和书籍元数据表达

## 这次改动做了什么

这一步执行的是 `02-02` 的第一刀。

主要变化有两件：

1. `BookshelfPreview.svelte` 的书籍卡片层级被重新整理
   - 封面左上角增加格式 badge
   - grid 卡片改成“标题 / 作者 / 辅助状态 / 进度+阅读状态”
   - list 卡片改成“标题 / 作者 / 元数据 pills / 右侧进度与辅助状态”
2. 导入 tile 不再只是一个简单占位框
   - 保留和真实书籍卡片一致的结构语言
   - 文案从简陋的格式列举改成正式导入说明

同时我把 `BookshelfPreviewBook` 扩成了真正能承载卡片表达的共享类型，让卡片可以直接消费：

- `format`
- `progressPercentLabel`
- `readingStatusLabel`
- `sourceLabel`

## 为什么这一步重要

之前的卡片能用，但更像“开发阶段的组件拼装”：

- `status` 和 `progress` 只是原样塞到界面上
- grid 和 list 的信息语言不统一
- 导入 tile 明显像一个特殊组件

这会带来一个问题：

同样一批书，在 library 中并没有被表达成“产品化书架条目”，而像“把字段渲染出来了”。

这次改完后，卡片开始更接近 Readest 的感觉：

- 封面是主角
- 标题和作者是第一层信息
- 阅读状态、格式、来源这些信息被压缩成辅助层
- 导入入口不再破坏整个书架语言

## 你可以学到的工程知识

### 1. 字段不等于界面语义

后端或 store 里常常有很多字段：

- `status`
- `progress`
- `readingStatusLabel`
- `sourceLabel`

但 UI 不应该机械地“一字段一行”。

更合理的做法是先决定：

- 哪个是主信息
- 哪个是辅助信息
- 哪个适合做 badge
- 哪个适合放到 trailing 区

然后再把字段映射成界面层级。

这就是为什么这次新增了：

- `getPrimaryProgress()`
- `getPrimaryStatus()`
- `getSecondaryMeta()`

先收敛语义，再渲染。

### 2. 共享类型要服务展示层，而不是只服务数据层

`BookshelfPreviewBook` 之前只带最基础字段，组件为了显示更多信息只能继续退回“硬编码文案”。

把共享类型补成真正够用的展示输入后，组件就能稳定依赖统一数据，而不是临时拼字符串。

这个思路很重要：

- 共享类型不是越小越好
- 而是要刚好覆盖当前这层组件真正需要的语义

## 本次相关文件

- `src/lib/components/library/BookshelfPreview.svelte`
- `src/lib/library/types.ts`
