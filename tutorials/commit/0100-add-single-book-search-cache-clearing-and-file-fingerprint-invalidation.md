# 0100: 给 reader search cache 加单本书清理和文件指纹失效

这次是在上一刀“搜索磁盘缓存”基础上补最后一层最关键的维护能力：

- 单本书搜索缓存清理
- 文件变化后的自然失效

否则缓存虽然有了，但长期会有两个问题：

1. 用户没有办法只清掉当前书的缓存  
2. 同一路径的书如果内容换了，旧缓存还会继续命中

## 这次改了什么

改动文件：

- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/services/readerSearchCache.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/services/index.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

### 1. 宿主侧增加“当前书缓存清理”命令

在 `lib.rs` 里新增了：

- `clear_reader_search_cache(app, book_key)`

它会删除：

- `app_data_dir()/reader-search/<book_key>/`

对应这一本书的整组搜索缓存。

这样 `sidebar` 现在终于能提供一个真正的“清空当前书缓存”动作，而不是只能靠重装 app 或手工删目录。

### 2. 宿主侧增加文件指纹命令

同样在 `lib.rs` 里新增了：

- `load_library_file_fingerprint(file_path)`

返回值由这些信息组成：

- 路径
- 文件大小
- 最后修改时间

也就是：

```text
<path>:<size>:<modified>
```

这样只要书文件被替换、覆盖、重新导出，指纹就会变。

### 3. `ReaderViewport` 不再用松散 label 当缓存归属键

之前 `searchCacheBookKey` 在有些路径下 still 可能退回到 `label`，这对失效策略不够稳。  
这次改成：

- `library-file`：优先用宿主文件指纹
- 手工 picker `File`：用 `name:size:lastModified`
- `asset`：继续用 URL

这样缓存命名空间会更稳定，也更容易随文件变化而自然失效。

### 4. Sidebar 现在可以清空当前书缓存

在 `ReaderSidebar.svelte` 的搜索历史区，新增了：

- `清空历史`
- `清空缓存`

其中：

- `清空历史` 只清 local search history
- `清空缓存` 会通过 route 调到宿主层，删除当前书的搜索缓存目录

## 这里对应的编程知识

### 1. “缓存清理”和“缓存失效”不是一回事

这两个概念经常容易混在一起：

- **缓存清理**：用户或系统主动删除缓存
- **缓存失效**：旧缓存因为版本变化而不再命中

这次两者都做了：

- `clear_reader_search_cache` 负责清理
- 文件指纹负责失效

很多系统只做其一，长期就会不够稳。

### 2. 为什么文件指纹比“只用路径”更可靠

如果缓存 key 只基于：

```text
/Users/me/book.epub
```

那同一路径下替换成新文件时，旧缓存 still 会命中。  
加上：

- size
- modified time

之后，最常见的文件更新场景就能自动换 key。

这是一种很常见的轻量失效策略：

- 不做复杂内容哈希
- 但已经足够覆盖大多数真实修改场景

## 我实际怎么验证

我实际跑了：

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
cargo check --manifest-path /Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

结果：

- `pnpm check`：PASS
- `cargo check`：PASS
- `git diff --check`：PASS

## 这次还没做的

- 还没有做缓存目录的自动过期回收
- 也还没有做更强的内容级哈希失效
- 清空缓存后还没有额外 toast 或显式反馈 UI
