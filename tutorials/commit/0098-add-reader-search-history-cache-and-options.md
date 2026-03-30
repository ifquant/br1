# 0098: 给 reader search 补历史、缓存和高级选项

这次是在上一刀“正文搜索真正打通”的基础上继续补 `Readest` 风格的搜索体验层。目标不是一下子复刻全部 SearchBar 细节，而是先把最重要的三样东西接上：

- 搜索历史
- 搜索缓存
- 搜索选项

这样 `reader search` 就不再只是“能搜一下”，而开始像一个正式的阅读器搜索面板。

## 这次解决什么问题

上一版虽然已经走通了：

- sidebar 发 query
- viewport 调 `foliate-view.search(...)`
- 返回正文结果

但还缺少几个很影响使用感的能力：

- 每次都要重新输关键词
- 相同查询会重复跑一遍全文搜索
- 不能切换“全书 / 本章”
- 不能控制大小写、整词、重音

这次就是把这些都补到最小正式版。

## 这次改了什么

改动文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/foliate.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

### 1. 增加正式搜索配置类型

在 `types.ts` 里新增了：

```ts
type ReaderSearchConfig = {
  scope: 'book' | 'section';
  matchCase: boolean;
  matchWholeWords: boolean;
  matchDiacritics: boolean;
};
```

并且把 `search` 控制请求改成：

```ts
{ type: 'search'; nonce; query; config }
```

这意味着搜索配置不再是 sidebar 私下自己管，而进入了 reader 的正式控制链。

### 2. 让 `ReaderViewport` 真正吃配置并做内存缓存

这次 `runSearch()` 不再只吃一个 `query`，而是：

- 同时接收 `ReaderSearchConfig`
- 根据 `scope` 决定搜整本书还是当前章节
- 把 `matchCase / matchWholeWords / matchDiacritics` 直接传给 `foliate-view.search(...)`

同时增加了：

- `searchCache = new Map<string, ReaderSearchResult[]>()`

缓存 key 由这些因素组成：

- query
- scope
- matchCase
- matchWholeWords
- matchDiacritics
- 如果 scope 是 `section`，还会把当前 section 编进去

所以同一本书里相同搜索配置的重复查询，现在会直接走内存缓存。

### 3. route 层开始持有搜索历史和搜索配置

在 `reader/+page.svelte` 里新增：

- `sidebarSearchHistory`
- `sidebarSearchConfig`

同时用 `localStorage` 做了两件事：

- `br1.reader.search.config`
- `br1.reader.search.history:<book-key>`

这意味着：

- 搜索配置是全局 reader 偏好
- 搜索历史按当前书隔离

这和阅读器使用习惯是比较一致的。

### 4. `ReaderSidebar` 现在有真正的搜索工具区

搜索 panel 里新增了：

- `全书 / 本章`
- `区分大小写`
- `整词`
- `保留重音`

同时新增了：

- `最近搜索`
- `清空`
- 点击历史词条直接重新发起搜索

这样 search panel 已经开始更像 `Readest SearchBar + SearchOptions` 的思路。

## 这里对应的编程知识

### 1. 为什么缓存 key 不能只用 query

如果你只拿 `query` 当缓存 key，会很容易出错。

例如：

- `economy`
- `scope=book`

和

- `economy`
- `scope=section`

明显不是同一个结果集。  
同样：

- `matchCase=true`
- `matchCase=false`

结果也可能完全不同。

所以缓存 key 必须包含“影响结果集的所有参数”，否则缓存命中会变成错误结果复用。

### 2. 为什么搜索历史更适合按书分开存

这次历史 key 是：

```ts
br1.reader.search.history:<book-key>
```

这样做比全局共享历史更合理，因为：

- 读政治学时搜的词，和读技术书时搜的词完全可能不同
- 用户看到“这本书里最近搜过什么”会比全局历史更有意义

这是一种很实用的本地状态建模方式：

- 全局偏好：独立 key
- 内容相关历史：按内容实体分 key

## 我实际怎么验证

我实际跑了：

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

结果：

- `pnpm check`：PASS
- `git diff --check`：PASS

## 这次还没做的

- 搜索缓存还是当前打开书内的内存缓存，还不是 `Readest` 那种磁盘缓存
- 还没有做最近命中项和当前位置最近结果的高亮
- 也还没有补搜索进度条、历史删除单项、以及更完整的 search toolbar 行为
