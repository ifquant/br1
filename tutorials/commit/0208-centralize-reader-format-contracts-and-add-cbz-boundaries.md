# 0208 把 reader 格式合同收拢起来，并把 CBZ 提升到正式边界

## 这次改动想解决什么

`br1` 之前的多格式边界有一个典型问题：

- `library` 的文件选择器允许哪些格式
- `reader` 的文件 input 接受哪些格式
- runtime 真正把哪些格式当成支持
- Rust 侧给文件贴什么 MIME

这些信息散在不同地方，而且还不一致。

结果就是：

- `CBZ` 在 `foliate-js` 能力范围内，但 `br1` 的前端输入口没把它当正式边界
- `TXT` 在 feature 目标里存在，但产品层没有明确说“现在还不支持”
- 后面继续推进 `P0-1` 时，很容易出现“某个地方能选，另一个地方不能开”的漂移

所以这次不是做完整多格式支持，而是先把**格式合同本身**收紧。

## 做了什么

### 1. 新增共享的 reader 格式合同模块

这次新增了：

- `src/lib/reader/formats.ts`

它把几件事统一成一个地方维护：

- 当前正式输入边界：
  - `epub`
  - `pdf`
  - `mobi`
  - `azw3`
  - `fb2`
  - `cbz`
- 当前已纳入规划、但尚未实现的格式：
  - `txt`
- 共享的 `accept` 字符串
- 桌面文件对话框扩展名列表
- 格式标签判断 helper

这一步的意义不是“抽常量”这么简单，而是把产品边界从隐式分散状态改成显式合同。

### 2. 让 library / reader 的输入口都走同一套合同

这次把下面几个入口都切到了共享合同：

- `library/+page.svelte`
- `ReaderStage.svelte`
- `ReaderWorkspace.svelte`
- `libraryPersistence.ts` 里的桌面选择器

现在如果要扩或收格式边界，不需要再同时改 4 个地方。

当前结果是：

- `CBZ` 已经进入正式输入边界
- `TXT` 还没有进入输入边界，因为它现在仍是“规划内但未实现”

### 3. runtime 加了显式格式降级语义

以前 `ReaderViewport` 遇到未支持格式，主要还是依赖底层报错再翻译。

这次补了一层更清楚的合同判断：

- 如果格式属于“规划内但未实现”（现在是 `TXT`）
  - 给出明确的 `planned but not implemented yet`
- 如果格式根本不在当前支持合同里
  - 给出明确的 `unsupported`

这一步很重要，因为它把“不支持”拆成了两种不同语义：

- **未来要做，但现在没做**
- **当前产品边界就不支持**

这比统统变成一个模糊错误更利于后面 `P0-1` 继续推进。

### 4. Rust MIME 映射补上了 `CBZ/TXT`

`src-tauri/src/util.rs` 里这次补了：

- `cbz -> application/vnd.comicbook+zip`
- `txt -> text/plain`

这里即使 `TXT` 当前还没正式开放输入边界，也值得先补上。

原因是：

- 后端记录文件类型时不应该继续把这两类东西误归到默认 `EPUB`
- 这样后面如果扩桌面打开或文件关联，也不会先踩到错误 MIME

### 5. feature audit 也同步了真实边界

这次同时更新了 `.planning/FEATURE-PARITY-AUDIT.md`，把“Multi-Format Support”的证据改成当前真实状态：

- `CBZ` 已进入文件合同
- `TXT` 仍是已纳入规划但未实现
- 整体仍然只是 `Partial`

这样 feature 总账就不会继续和代码实际边界脱节。

### 6. 补了一条最贴近这刀的 smoke 验证

`tests/e2e/library-smoke.spec.ts` 现在会检查：

- `library` 页里的隐藏导入 input
- `accept` 是否已经变成：
  - `.epub,.pdf,.mobi,.azw3,.fb2,.cbz`

这不能证明 `CBZ` 已经完整可读，但能证明输入合同已经统一到位。

## 验证

这次实际跑过：

```bash
pnpm check
```

结果：`PASS`

```bash
pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line
```

结果：`PASS`

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

结果：`PASS`

```bash
git diff --check
```

结果：`PASS`

## 这次顺手能学到的编程知识

### 1. “功能支持”最好拆成输入合同、runtime 合同、错误合同

很多项目会把“支持某格式”理解成一个单点结论，但实际上通常至少有三层：

- 输入口让不让用户选
- runtime 能不能真正打开
- 打不开时怎么报错

如果这三层不同步，就会出现“能选不能开”或“能开但报错很怪”的产品问题。

### 2. “未实现”和“不支持”不是一回事

从工程上看，这两类都可能最终表现成打开失败，但它们在产品语义上完全不同：

- `planned but not implemented yet`
- `unsupported`

把它们拆开，后面排计划、写回 feature audit、或者给用户解释当前边界时，都会清楚很多。

## 还没有处理什么

- 这一步没有证明 `FB2/MOBI/AZW3/CBZ` 已经完成端到端阅读验证
- 没有把 `TXT` 真正做成可读格式
- 也没有实现 OS 级 `Open With br1` 文件关联注册

这一步只是先把 `P0-1` 的格式合同边界收紧，避免后面继续在模糊边界上推进。
