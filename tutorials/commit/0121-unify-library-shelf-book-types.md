# 背景

`br1` 的 library 相关 UI 里，原先同时存在三份相近但不完全一致的书籍类型：

- `library/+page.svelte` 里的 `ShelfBook`
- `BookshelfPreview.svelte` 里的 `Book`
- `ContinueReadingShelf.svelte` 里的 `Book`

这类重复在小页面里看起来还可以接受，但随着 library 继续向 Readest 靠拢，字段会继续增加，例如：

- 最近阅读时间
- 来源标签
- 重开入口
- 详情面板元数据

如果三个地方各自维护一套类型，后面每次加字段都要反复同步，很容易出现“页面能跑，但某个组件类型已经过时”的情况。

# 主要目标

- 给 library 书架数据建立一个统一的共享类型来源
- 让 route 持有完整类型，组件只声明自己真正需要的字段
- 为后续 sidebar/controller 拆分前，先把 library 的接口边界整理干净

# 改动概览

- 新增 [`src/lib/library/types.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/library/types.ts)
- 在其中定义完整的 `LibraryShelfBook`
- 用 `Pick<LibraryShelfBook, ...>` 派生：
  - `BookshelfPreviewBook`
  - `ContinueReadingBook`
- `library/+page.svelte` 改为直接使用 `LibraryShelfBook`
- `BookshelfPreview.svelte` 和 `ContinueReadingShelf.svelte` 改为从共享类型文件导入类型，而不再在组件内部重复声明本地 `Book`

# 关键知识

## 1. 为什么 route 持有 superset，子组件持有 subset

在这个场景里，`library/+page.svelte` 是组装层，它需要知道更完整的书籍信息，因为它负责：

- 把后端记录映射成页面数据
- 决定哪些书进入 `continue reading`
- 决定哪些字段传给哪个 shelf 组件

所以 route 适合持有一个“完整但仍然面向 UI”的 superset 类型，也就是 `LibraryShelfBook`。

但组件不应该因为 route 拿着完整对象，就被迫声明自己也依赖全部字段。  
例如 `BookshelfPreview` 实际只需要：

- `title`
- `author`
- `status`
- `progress`
- `coverUrl`
- `readerHref`

这时用 `Pick<LibraryShelfBook, ...>` 更合理，因为它明确表达了组件真实依赖面。  
这样以后别人改 `LibraryShelfBook` 时，组件接口不会无意义膨胀。

## 2. `Pick` 的价值是“收紧依赖面”，不是偷懒少写字

很多人看到 `Pick` 会觉得它只是省得重新写类型字段。  
这只是表面收益，真正更重要的是：它能防止子组件隐式依赖额外字段。

如果继续让组件写：

```ts
type Book = {
  title: string;
  author: string;
  ...
}
```

表面上看一样，实际问题是：

- route 的字段演进和组件的字段演进是分叉的
- 组件需要哪些字段，得靠人工比对才能知道

而 `Pick<LibraryShelfBook, ...>` 把这层关系写死了：

- 所有组件字段都来自同一个源类型
- 组件需要什么字段，一眼能看出来
- 共享字段的命名不会悄悄漂移

## 3. 为什么这一步值得在大重构前先做

这次还没开始 sidebar prop 合并和 reader controller 拆分，但先做类型统一是划算的，因为它属于低风险“接口清理”：

- 不改运行逻辑
- 不改渲染结构
- 只减少重复定义

这种前置整理的作用，是让后面的重构建立在更清晰的边界上。  
如果类型边界本身就散乱，后面做 controller 或 prop object 合并时，只会把混乱继续搬运下去。

# 验证

- `pnpm check` (PASS)
- `git diff --check` (PASS)

# 未覆盖项

- 这次没有继续统一 `starterBooks` / `starterImports` 的静态样例结构
- 这次没有新增 `src/lib/library/index.ts` 之类的 barrel export
- 这次没有做 sidebar prop 合并、controller 拆分或 Rust 模块拆分
