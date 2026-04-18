# 0217: 保持 FB2 作者和 Kindle 小进度标签可读

本次提交继续沿着多格式 metadata 线收口，但不再扩 opening path，而是修两类真实的 library 持久化问题：

1. `FB2` 样本虽然文件里有作者信息，回到 library 后仍然会保留 `Unknown author`。
2. `MOBI/AZW3` 这类很小但非零的阅读进度，会被写成 `上次读到 0%`，这属于产品层面的假零进度。

## 为什么这一步要做

前一轮已经把 `title/status` 收得更像产品了，但 metadata 还剩两种低质量输出：

- `FB2` 的作者名没有随着阅读回写被带回 library。
- Kindle 家族格式在 tiny progress 下会把用户已经开始阅读的状态写成 `0%`。

这两个问题如果不修，`P0-1` 的多格式证据还是停留在“能打开”，没有真正收进“人类可读的书库元数据”。

## 改了什么

### 1. 在 Rust 导入层为 `FB2` 抽作者

文件：

- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/library.rs`
- `/Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml`

这里新增了 `quick-xml` 依赖，并增加：

- `derive_fb2_author(source: &Path) -> Option<String>`
- `author_looks_like_placeholder(value: &str) -> bool`

`derive_fb2_author()` 会在导入 `.fb2` 时直接扫描 `title-info > author` 下的：

- `first-name`
- `last-name`
- `nickname`

然后优先拼出 `first-name + last-name`，否则退回 `nickname`。

这样 `FB2` 记录在第一次进入 library 时就不必从 `Unknown author` 开始。

### 2. 禁止回写层用占位作者覆盖已有作者

同一个文件里，`update_library_reading_state()` 以前只要收到非空 `author` 就会写回。现在改成：

- 只有当 `author` 不是占位值时，才会覆盖 `record.author`

被拦住的占位值包括：

- `Unknown author`
- `Reader workspace`
- `Preparing book`
- `Open failed`

这样 reader 侧即使暂时没拿到作者，也不会把 import 时已经解析出的 `FB2` 作者冲掉。

### 3. 正进度但四舍五入成 0 的情况，统一抬到最小 1%

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`

这里新增了：

- `formatReaderProgressPercent(fraction)`

逻辑很简单：

- `fraction <= 0` 时仍然是 `0`
- `fraction > 0` 时至少显示 `1`

所以像 `AZW3` 那种已经前进了一点点、但原本会显示成 `0%` 的状态，现在会统一进入非零进度语义。

### 4. `pickAuthor()` 补进常见名字结构

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/foliate.ts`

这里顺手把 reader 侧作者提取能力补强了，新增支持：

- `firstName / lastName`
- `givenName / familyName`
- `first-name / last-name`

虽然这次 `FB2` 主要是靠导入层补齐作者，但 reader 侧的作者抽取能力也不该继续只认识 `name`。

## 测试怎么补的

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

新增 focused regression：

- `keeps fb2 authors and tiny kindle progress labels human-readable after reader round-trips`

它会：

1. 导入 `FB2/MOBI/AZW3` 样本
2. 分别打开并推进阅读状态
3. 返回 library
4. 直接检查磁盘上的 `library.json`

断言：

- `FB2` 的 `author === "Bridge Team"`
- `MOBI/AZW3` 的 `progress !== "上次读到 0%"`

这条测试把“library 元数据可读”从 `title/status` 扩到了 `author/progress`。

## 这一步的边界

这次没有做：

- `MOBI/AZW3` 作者提取
- 更广的跨格式 metadata schema 统一
- annotation/search 等更高层产品行为

它只解决当前最明确、最容易让书库看起来“不像产品”的两条 metadata 输出问题。
