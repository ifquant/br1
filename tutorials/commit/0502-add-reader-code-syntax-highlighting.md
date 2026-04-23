# 0502: 给 reader 正文增加轻量代码高亮

这一刀完成 `P1-3.3 Add code syntax highlighting`。目标不是引入一个完整 IDE 级高亮器，而是先让 reader 里的代码块有一条明确、可测试、可维护的高亮路径，避免只靠浏览器默认的 `<pre>` / `<code>` 样式。

## 这次改了什么

新增的核心模块是 `src/lib/reader/codeHighlighting.ts`。它做三件事：

1. 用一个很小的 tokenizer 识别常见代码 token：keyword、string、number、comment、operator、property 等。
2. 给 foliate/EPUB 书籍正文里的 `pre code` / `pre` 节点插入 `reader-code-token-*` span。
3. 给 TXT fallback 支持 Markdown 风格 fenced code block，例如：

````text
```ts
const answer = 42;
```
````

普通 TXT 文件没有 fenced code block 时仍然走原来的单个 `<pre>{plainTextContent}</pre>` 路径，所以现有 TXT selection / notes 测试依赖的纯文本节点不被破坏。

## foliate 边界怎么接入

EPUB、MOBI、AZW3、FB2 这类格式由 `foliate-view` 把正文放进内部 document。reader 原来已经在 `ReaderViewport.svelte` 里通过 `renderer.getContents()` 绑定 selection tracking。

这次复用同一个边界：

- `bindOpenRendererDocs()` 先拿到 foliate document。
- 对每个 document 调用 `applyReaderCodeHighlightingToDocument(doc)`。
- 再继续绑定原有 selection tracking。

这样代码高亮属于 reader content injection 边界，不需要改书籍文件，也不需要给 foliate-js 增加新依赖。

## TXT fallback 怎么处理

TXT fallback 以前只渲染：

```svelte
<pre>{plainTextContent}</pre>
```

这对纯文本很好，但没有办法表达代码 token。现在打开 TXT 时会先调用：

```ts
plainTextBlocks = parsePlainTextCodeBlocks(plainTextContent);
```

如果没有 fenced code block，仍然走旧渲染路径。如果有 fenced code block，则只对代码段输出带 token span 的 HTML；普通段落仍然保持 `<pre>`。HTML 字符会先 escape，再插入 token span，避免把 fixture 内容当成真实 HTML 执行。

## 为什么不加依赖

这次只需要证明 reader 有明确代码块高亮路径，不需要支持所有语言语法。引入 Prism、highlight.js 或 Shiki 会带来更大的 bundle 和主题维护面，不适合作为这个 commit-sized slice 的第一步。

当前 tokenizer 覆盖的是 reader 常见说明文档代码块的基础体验：

- JS/TS 常见 keyword
- 字符串和模板字符串
- 数字
- 行注释
- 常见 operator
- CSS/TS 风格 property

后续如果要做完整语言覆盖，可以在这个模块后面替换实现，而不需要再改 reader 入口边界。

## 回归测试

新增 `static/samples/sample-code-block.txt`，里面包含一个 `ts` fenced code block。

新增 e2e：

```text
reader highlights fenced code blocks in the txt fallback surface
```

它验证：

- TXT fixture 能打开到 reader。
- 代码块带 `data-language="ts"`。
- keyword、number、comment token 都生成了对应 class。
- 代码块后的普通正文仍然渲染。

## 验证

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check
```

结果：PASS。

```bash
git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check
```

结果：PASS。

```bash
CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec exec playwright test tests/e2e/library-smoke.spec.ts -g "reader highlights fenced code blocks"
```

结果：PASS。

这里使用 `CI=1` 是为了强制 Playwright 启动新的 web server，避免本机已有的 `4173` dev server 被复用后拿到旧 bundle。

## 没有包含什么

这次没有做完整语言生态支持，也没有引入 Shiki/Prism/highlight.js。它也没有尝试重写 EPUB 出版方已有的复杂代码高亮 markup；如果正文里已经有 token span，reader 会标记为已处理并保留现有结构。
