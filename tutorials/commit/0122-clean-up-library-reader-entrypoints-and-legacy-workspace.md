# 背景

这次 review 里还有几类零散但会持续增加维护成本的小问题：

- `library/+page.svelte` 里自己拼了一份 `assetHref()`，和 service 层的 reader URL 构造职责重叠
- `ReaderWorkspace.svelte` 已经不是当前主路径，但代码里没有明确告诉后续维护者“它是旧壳层”

这些问题单看都不大，但如果不先处理，后面做 sidebar prop 合并和 controller 拆分时，边界会继续模糊：  
有的 URL 在 route 拼，有的在 service 拼；有的 reader 壳层是当前方案，有的只是历史残留，但没有标识。

# 主要目标

- 把 asset 场景的 reader URL 也统一收进 service 层
- 给旧的 `ReaderWorkspace` 明确废弃标记
- 不改实际导入/打开流程，只做接口和协作层清理

# 改动概览

- 在 [`src/lib/services/libraryPersistence.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts) 中新增共享的 `toReaderHref()` 内部构造器
- 基于它导出 `toAssetReaderHref()`，统一 asset 书籍和临时对象 URL 的 reader 跳转构造
- `toReaderAssetHref()` / `toReaderStartHref()` 改为复用同一套内部 URL 拼装逻辑
- `library/+page.svelte` 删除本地 `assetHref()`，统一改用 service 层 helper
- 在 [`src/lib/components/reader/ReaderWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderWorkspace.svelte) 和 [`src/lib/components/index.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/index.ts) 中增加 `@deprecated` 标记，明确当前应优先使用 `ReaderStage`

# 关键知识

## 1. 为什么 URL 构造也算 service 边界的一部分

很多人会把“拼一个 `/reader?...` 链接”看成很轻的事情，于是随手在 route 里写一个 helper。  
但在 `br1` 这里，这种 URL 实际上已经承载了 reader 的入口协议：

- `source=asset`
- `source=library-file`
- `path`
- `url`
- `label`
- `fraction`
- `location`

也就是说，这不是“普通字符串拼接”，而是 reader 的外部入口约定。  
一旦这个约定分散在多个页面里，后续改参数名或扩展来源类型时，就很容易漏改。

把它收回 service 层的好处是：

- route 只表达“我要打开哪类书”
- service 负责把它编码成 reader 入口协议
- 后面如果参数演进，只需要改一个地方

## 2. 为什么“废弃”不等于“立刻删除”

`ReaderWorkspace.svelte` 现在看起来已经不是主路径了，但这不意味着立刻删除一定是最优选择。

删除旧组件前，通常至少要满足两个条件：

- 确认没有任何直接引用
- 确认它不再作为回退参考或旧布局对照物存在价值

当前这个组件虽然没在主要 route 上使用，但它仍然保留了一些旧壳层组织方式。  
在 reader 行为还在持续对齐 Readest 的阶段，直接删除有可能让排障和对照变得更困难。

所以这一步更稳的做法是：

- 先明确标注 `@deprecated`
- 让后续维护者知道它不是推荐路径
- 真正删除放到更有把握的清理切片里

这也是渐进式重构的常见策略：先标识、再迁移、最后删除。

# 验证

- `pnpm check` (PASS)
- `git diff --check` (PASS)

# 未覆盖项

- 这次没有删除 `ReaderWorkspace.svelte`
- 这次没有继续处理 `src/lib/stores/index.ts`
- 这次没有做 sidebar prop 合并、controller 拆分或 Rust 模块拆分
