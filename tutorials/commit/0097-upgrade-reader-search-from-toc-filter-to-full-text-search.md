# 0097: 把 reader search 从 TOC 过滤升级成正文搜索入口

这次提交终于把 `reader` 左侧栏里的 `搜索` 从假功能推进成了真实正文搜索。之前的实现只是拿 TOC 标题做过滤，这在视觉上能交差，但行为上离 `Readest` 差很远。`Readest` 真正做的是调用阅读引擎的 `view.search(...)`，返回正文匹配结果，再允许用户跳到命中的位置。

## 这次解决什么问题

之前 `ReaderSidebar.svelte` 里的 `搜索` panel 有两个问题：

- 搜索的不是正文，而是目录标题
- 点结果跳的也是章节，不是正文命中点

所以虽然它“能搜”，但并不是用户真正理解的“在书里搜内容”。

这次的目标就是把它改成：

- 输入查询
- 交给 `foliate-view.search(...)`
- 获取正文命中结果
- 点击结果跳到具体命中位置

## 这次改了什么

改动文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/types.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/index.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/foliate.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderStage.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte`

### 1. 给 reader 类型系统补搜索状态

在 `types.ts` 里新增了：

- `ReaderSearchExcerpt`
- `ReaderSearchResult`
- `ReaderSearchState`

并给 `ReaderControlRequest` 增加：

```ts
{ type: 'search'; nonce: number; query: string }
```

这样 search 不再是 sidebar 自己偷偷做的事情，而是进入 reader 的正式控制链。

### 2. 给 `FoliateViewElement` 补最小搜索接口类型

在 `foliate.ts` 里，我给 `FoliateViewElement` 增加了：

- `search(opts)`
- `clearSearch()`

这样 TypeScript 才能把 `foliate-view.search(...)` 当成正式能力来用，而不是到处 `as any`。

### 3. 在 `ReaderViewport` 里真正跑正文搜索

这一步是核心。

新增了：

- `runSearch(query)`
- `emitSearchState(...)`
- `lastSearchToken`

逻辑是：

1. 新搜索来了，先 `clearSearch()`
2. 通过 `foliateViewElement.search({ query })` 迭代结果
3. 把结果压平成 `ReaderSearchResult[]`
4. 通过 `searchchange` 事件派发给上层

这里用 `lastSearchToken` 是为了避免旧搜索晚回来，把新搜索结果覆盖掉。这个是前端异步搜索里一个很实用的小技巧。

### 4. route 层开始真正持有搜索状态

在 `reader/+page.svelte` 里新增：

- `sidebarSearchTerm`
- `sidebarSearchStatus`
- `sidebarSearchResults`
- `sidebarSearchError`

然后：

- sidebar 发 `onSearch(query)`
- route 变成 `controlRequest`
- viewport 跑搜索
- viewport 再通过 `searchchange` 回写 route
- route 再把结果传回 sidebar

这就是一个完整的“受控搜索面板”数据流。

### 5. `ReaderSidebar` 现在显示正文命中结果

搜索 panel 现在会显示：

- 搜索中状态
- 命中数
- 正文摘录
- `<mark>` 高亮命中词

点击结果后会：

- 调 `onSearchResult(item.cfi)`
- 通过现有 reader 控制链跳到具体命中位置

这已经不是 TOC 过滤，而是真正的阅读器正文搜索入口。

## 这里对应的编程知识

### 1. 为什么搜索结果不能只存在 sidebar 组件里

表面看，搜索框在 sidebar，结果也显示在 sidebar，好像把状态都写在 `ReaderSidebar.svelte` 就行。  
但真正的搜索执行者其实是 `ReaderViewport` 里的 `foliate-view`。

所以这条链天然跨组件：

- sidebar 发起搜索
- viewport 执行搜索
- route 协调状态
- sidebar 渲染结果

这就是为什么这类功能经常需要“提升状态”到上层组合层，而不是让一个组件自己偷偷做完。

### 2. 为什么要用 token 防止旧搜索覆盖新搜索

搜索是异步的。假设用户快速输入：

- `po`
- `polit`
- `politics`

旧请求可能晚回来。如果不做控制，就会出现：

- 用户看到的输入是 `politics`
- 结果却被 `po` 的返回覆盖了

这次用的是一个很常见的办法：

```ts
lastSearchToken += 1;
const token = lastSearchToken;
```

等异步结果回来时再比较：

```ts
if (token !== lastSearchToken) return;
```

这样旧请求就会自动失效。

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

- 还没有接 `Readest` 那套搜索缓存、历史记录、搜索范围和大小写等高级选项
- 搜索结果还没做“离当前阅读位置最近”的自动高亮
- 搜索状态还没有接 reader 的快捷键和更完整的 sidebar 搜索工具栏
