# 0040: 让 library 的导入 tile 进入 reader 并尝试拉起文件选择

这次补的是书架上的 `导入书籍` tile。

之前它只是一个视觉上的入口，看起来像能导入，但点击后不会把用户带到真正的阅读流程里。这和 `Readest` 的思路不一致。`Readest` 的 library 不是静态展示区，而是阅读入口和导入入口的主舞台。

所以这一步只做一件事：

- 点击 `导入书籍`
- 进入 `/reader`
- 并让 `reader` 尽量直接拉起文件选择器

这样 library 的导入 tile 就从“长得像按钮”变成“真的能把用户送进阅读流程”。

## 这次做了什么

1. 给 `BookshelfPreview` 加 `importHref`

在 [`BookshelfPreview.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/BookshelfPreview.svelte) 里，`showImportTile` 之前只能决定“要不要显示导入卡片”，但不能决定“点了去哪里”。

现在新增了 `importHref`：

- 有值时，导入卡片渲染成 `<a>`
- 没值时，仍然退回纯展示卡片

这样 `import tile` 和普通书卡都沿用了同一种“有链接就可导航”的组件思路。

2. library 把导入 tile 指向 reader

在 [`library/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte) 里，这次把导入 tile 接到了：

`/reader?source=picker`

这代表：

- 由 library 决定“我要去 reader 做导入”
- 由 reader 决定“到了以后怎么处理这个意图”

这和前一提交里 `source=sample` 的思路是一致的。

3. reader route 新增 `picker` 意图

在 [`reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte) 里，新增：

- `autoOpenPicker = source === 'picker'`

然后把它传给 `ReaderWorkspace`。

也就是说，page route 现在不仅能表达“自动打开样例书”，也能表达“进入 reader 后尝试直接打开文件选择器”。

4. `ReaderWorkspace` 尝试自动拉起文件选择器

在 [`ReaderWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderWorkspace.svelte) 里，这次做了一个最小的自动 picker 逻辑：

- 优先尝试 `input.showPicker()`
- 失败时回退到 `input.click()`

同时用了一个 `hasAttemptedAutoPicker` 防止在 reactive 更新里重复触发。

另外，右上角的 `Open` 按钮也改成复用同一个 `triggerImportPicker()`，这样自动入口和手动入口不会分叉。

## 你可以学到的具体知识

### 1. 为什么这里优先尝试 `showPicker()`，再回退到 `click()`

`showPicker()` 是更明确的现代文件选择 API，语义更直接：

- 我就是要打开这个 input 对应的系统选择器

但并不是所有环境都支持它，或者都允许它成功执行。

因此更稳的写法是：

1. 先检查 `typeof input.showPicker === 'function'`
2. 能用就尝试
3. 失败时再退回 `input.click()`

这就是典型的 **feature detection + fallback**。

### 2. 为什么自动打开 picker 要做“一次性闸门”

Svelte 的 `$:` 响应式语句会在依赖变化时重新跑。

如果你写成：

- `if (autoOpenPicker) input.click()`

那么只要组件更新、状态变化，文件选择器就可能被重复触发，体验会很差。

所以这次加了：

- `hasAttemptedAutoPicker`

这类布尔闸门很常见，用来表达：

- 当前 URL 意图是“要触发一次”
- 但这个动作不应该在后续每次重新渲染时重复发生

## 实际影响

现在 `br1` 至少具备了这条更完整的产品动线：

- 在 `library` 点击 `导入书籍`
- 进入 `reader`
- `reader` 尝试直接拉起文件选择器
- 如果自动拉起失败，右上角 `Open` 仍然是明确兜底入口

这还不是完整的书库导入系统，但它已经不是静态展示了，而是一条真实可走的导入路径。
