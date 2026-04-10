# 背景

在上一轮重构复审里，发现了三处真实回归风险：

1. `searchController.refreshHistory()` 和 `notesController.refresh()` 没有绑定真实的 reactive 依赖  
2. 切书时 `notesController` 没有主动清掉旧书的 `selection` / `activeCfi`  
3. Rust search cache 的单书目录键在“写入”和“按书清理”两边不一致

这次不是继续做新重构，而是把这三条风险补平，确保前面的结构整理没有留下明显行为缺口。

# 主要目标

- 修复 notes/search 在切书场景下的刷新与状态残留问题
- 修复 Rust search cache 的单书清理路径失效问题
- 保持当前架构不变，只补回归风险

# 改动概览

- [`src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte)
  - 新增显式 `readerBookKey`
  - 让 search history refresh 依赖 `readerBookKey`
  - 让 notes refresh 依赖 `notesStorageKey`
  - 去掉 `onMount` 里那两个隐式一次性 refresh 调用，避免和后续依赖驱动的 refresh 逻辑混淆
- [`src/lib/reader/notesController.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/notesController.ts)
  - 切到新 storage key 时，先清空 `activeCfi`、`selection` 和旧 `notes`
  - refresh 成功或失败后，都明确把这两个瞬时状态重置
- [`src-tauri/src/util.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/util.rs)
  - `prune_reader_search_cache_book()` 改为和 `reader_search_cache_file()` 使用同一套 `reader_search_cache_component_key(book_key)` 目录规则

# 关键知识

## 1. Svelte reactive 语句必须显式引用依赖

像这样写：

```ts
$: notesController.refresh();
```

从直觉上看像是在“每次相关条件变化时刷新”，但实际上它只依赖语句里显式出现的变量。  
如果语句里没有直接引用 `notesStorageKey`，Svelte 不会知道“storage key 变了就该重跑”。

所以这次改成了：

```ts
$: {
  notesStorageKey;
  notesController.refresh();
}
```

这类写法的核心不是语法技巧，而是告诉编译器：  
**“这个副作用由哪个状态驱动”**。

同理，search history 的 refresh 也要显式依赖当前书籍 key。

## 2. 切上下文时，旧的瞬时状态要主动清空

`selection` 和 `activeCfi` 这类状态不是长期数据，它们是“当前这本书、当前这个界面瞬间”的 UI 语义。  
如果切到另一本书时不主动清掉，就会把旧书的上下文误带到新书里。

一个实用判断标准是：

- 可以跨书保留的：持久化数据，例如 notes 列表
- 不该跨书保留的：选区、当前高亮、当前打开项这类瞬时状态

这次就是把这个边界补齐了。

## 3. 路径键规则必须前后一致

Rust search cache 那个问题本质上不是算法问题，而是“同一个资源标识，前后用了两套编码规则”：

- 写入时：SHA-256
- 单书清理时：base64

这类 bug 很隐蔽，因为：

- 编译完全正常
- 功能表面也能跑
- 只有清理/上限控制悄悄失效

所以处理文件缓存、目录映射、索引键时，一个很重要的原则是：  
**路径规则必须只有一个来源，不要在不同函数里各写一套。**

# 验证

- `pnpm check` (PASS)
- `cargo check --manifest-path src-tauri/Cargo.toml` (PASS)
- `git diff --check` (PASS)

# 未覆盖项

- 这次没有新增针对 controller 的自动化测试
- 这次没有继续做新的结构重构
- 目前工作区里未提交的 `ReaderViewport.svelte` / `e2e/app.e2e.ts` 排障线仍未并入本次提交
