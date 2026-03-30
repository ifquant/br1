# 0099: 把 reader search cache 从内存推进到磁盘

这次是在上一刀“历史、缓存、搜索选项”基础上继续收口。上一版虽然已经有缓存，但还是**当前打开书内的内存缓存**，一关窗口就没了，离 `Readest` 的搜索缓存链还差一层。  

这次做的就是把这层补上：

- 先读内存缓存
- 再读宿主磁盘缓存
- 搜索完成后回写磁盘缓存

这样 `br1` 的搜索缓存职责就和 `Readest` 一样，主要放在 app host，而不是继续压到阅读组件里。

## 这次改了什么

改动文件：

- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/services/readerSearchCache.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/services/index.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`

### 1. 宿主侧增加正式的搜索缓存命令

在 `lib.rs` 里新增了两条 Tauri command：

- `load_reader_search_cache`
- `save_reader_search_cache`

缓存存储位置在：

- `app_data_dir()/reader-search/<book>/<cache>.json`

为了避免路径里直接塞原始 query/config 字符串，这次用了：

- `base64::engine::general_purpose::URL_SAFE_NO_PAD`

把 `book_key` 和 `cache_key` 编成更稳定的路径片段。

### 2. 前端增加一个很薄的宿主服务层

新文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/services/readerSearchCache.ts`

它只做两件事：

- `loadReaderSearchCache(...)`
- `saveReaderSearchCache(...)`

这样 `ReaderViewport` 不需要直接碰 Tauri `invoke` 细节，职责会更清楚。

### 3. `ReaderViewport` 现在按三层顺序找缓存

搜索流程现在是：

1. 先看内存 `Map`
2. 没命中再看宿主磁盘缓存
3. 还没有才真正跑 `foliate-view.search(...)`
4. 搜索完成后：
   - 写回内存缓存
   - 再写回磁盘缓存

这和 `Readest SearchBar` 的总体思路已经接近了。

### 4. 每本书有自己稳定的缓存键

这次我没有把磁盘缓存绑死在某个 UI 状态上，而是给 `ReaderViewport` 增加了：

- `searchCacheBookKey`

打开书时会根据：

- 资产 URL
- library file path
- 或当前打开源 label

生成当前书的缓存归属键。  
这样同一本书的搜索缓存会稳定地落到同一组文件里。

## 这里对应的编程知识

### 1. 为什么“磁盘缓存”最好通过宿主层来做

你当然也可以直接在前端：

- `localStorage`
- `indexedDB`

里存搜索结果。  
但对桌面阅读器来说，宿主层做缓存通常更合理，因为：

- 路径更稳定
- 文件组织更清楚
- 更接近 `Readest` 这种桌面 app 的职责分层
- 以后做清理、导入导出、调试都更方便

这就是为什么这次没有继续把缓存做在 Svelte 组件里，而是收到了 Tauri command。

### 2. 为什么缓存路径不能直接拿原始 query 当文件名

原始 query 可能有：

- 空格
- 标点
- 斜杠
- Unicode

这些都不适合作文件名。  
所以这次用的是：

- URL-safe base64

把逻辑 key 变成文件系统更稳定的路径片段。  
这类“逻辑 key -> 文件系统 key”的转换，在桌面 app 里很常见。

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

- 还没有做 `Readest` 那种搜索进度显示和更细粒度的长搜索反馈
- 还没有做“离当前位置最近结果”的自动高亮
- 也还没有加单本书搜索缓存清理或失效策略
