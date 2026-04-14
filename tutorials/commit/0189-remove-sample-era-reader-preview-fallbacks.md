# 0189: 去掉 reader preview 里的样书时代 fallback

## 这次改动解决什么

`Phase 4` 的第一刀不是直接大修 `EPUB` 打开逻辑，而是先清掉一个容易误导排障的残留：

- reader 打开链路里已经没有样书逻辑了
- 但 `ReaderViewport` 在某些 fallback 状态下仍然会发出 `Reader sample`

这会导致一个很糟糕的效果：

- 打开真实书之前
- 打开失败之后
- 或还在 loading 的时候

顶栏、侧栏、footer 收到的 preview state 里，仍然像是在读一本叫 “Reader sample” 的书。

这不只是文案难看，而是会干扰判断：

- 当前到底是没打开成功
- 还是打开了某本假样书

## 这次具体做了什么

### 1. 给 `ReaderViewport` 增加统一的 fallback reader state

文件：`src/lib/components/reader/ReaderViewport.svelte`

新增了：

- `getFallbackReaderState()`

它统一负责生成中性的 preview state，默认包含：

- `title`
- `author`
- `chapterLabel`
- `progress`
- `locationLabel`
- `formatLabel`
- `layoutLabel`

这样之后不管是 idle / loading / error，reader 都能回到一致的中性状态，而不是各处零散硬编码。

### 2. open 之前就显式发出 loading preview

文件：`src/lib/components/reader/ReaderViewport.svelte`

`openBook()` 现在在真正开始打开文件前，会先发出一个 loading 态的 preview：

- 标题优先显示当前要打开的书名
- 作者显示为 `Preparing book`
- 章节显示为 `Opening book`
- 位置显示为 `Opening book`

这样上层 UI 现在能明确知道：

- 书正在打开

而不是继续显示旧书状态，或者掉回一个假样书标题。

### 3. 失败时也发出真实 error preview

文件：`src/lib/components/reader/ReaderViewport.svelte`

如果：

- `openBook()` 失败
- 或 `applyControlRequest()` 里的 reader control 失败

现在都会显式发出：

- `title = 当前书名或 Bridge Reader`
- `author = Open failed`
- `chapterLabel = Unable to open book`
- `locationLabel = Open failed`

这样 header/sidebar/footer 收到的状态会更接近“真实失败”，而不是继续显示旧书或 `Reader sample`。

### 4. 打开的真实书不再回退到 `Reader sample`

文件：`src/lib/components/reader/ReaderViewport.svelte`

`emitReaderState()` 现在在 `openStatus !== 'open'` 或 `book` 不存在时，会直接走统一 fallback；

只有真的已经打开书时，才会读取：

- metadata title
- author
- toc/location

同时真实打开态的标题 fallback 也从：

- `Reader sample`

改成：

- 当前 source label 或 `Bridge Reader`

这样至少不会再冒充一本文本存在的样书。

## 这次学到的编程知识

### 知识点 1：空态、加载态、失败态也应该有正式的数据模型

很多 UI bug 的根因不是“成功态错了”，而是：

- 加载态没有正式数据
- 失败态沿用了旧数据
- 空态随便塞了个假标题

一旦这些状态也通过统一的 state model 发出去，上层组件才不会乱猜。

### 知识点 2：排障时，假的 fallback 文案会比空白更糟

空白至少说明：

- 还没有数据

但像 `Reader sample` 这种遗留 fallback 会制造一种假象：

- 好像系统真的打开了某个默认样书

这会直接误导你判断主链路问题，所以在正式产品化阶段，这类文案应尽早清掉。

## 这次没有处理什么

- 没有直接修 `EPUB/PDF` 更深层的恢复几何问题
- 没有改 `foliate-js` / `pdf.js` 接入结构，只处理了 reader preview state
- 更激进的恢复回归在当前本地环境仍不稳定，这次只验证了基础打开和 metadata 路径
