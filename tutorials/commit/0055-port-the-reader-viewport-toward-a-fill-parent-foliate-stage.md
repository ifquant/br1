# 0055: 把 reader 主舞台改成更接近 Readest 的 fill-parent 结构

这次提交不是继续修边距，而是把 `br1` 的 reader 中央区结构往 `Readest` 的 `BooksGrid + FoliateViewer` 模型再推进一层。

之前的问题很直接：

- `window-mode` 下中央区仍然是“盒中盒”
- `ReaderViewport` 里还有 `engine-paper / paper-header / 说明文案`
- 所以正文没有吃满主列，看起来像一个 demo 卡片，而不是阅读器本体

这次改完之后，独立阅读窗会更像：

- 左边是侧栏
- 中间是一整块阅读舞台
- 顶部/底部 bar 作为覆盖层压在舞台边缘

而不是：

- 上面一条
- 中间一个被卡片包住的小舞台
- 右边空着

## 这次改了什么

1. `ReaderStage.svelte`

- `window-mode` 下把 `canvas` 的内边距清零
- 让中央舞台真正接管这一列，而不是先被外层 padding 吃掉

2. `ReaderViewport.svelte`

- `window-mode` 下不再渲染 `engine-paper`
- 直接把 `foliate-view` 宿主挂在 `engine-stage` 里
- 把 `Open sample` 保留成主舞台中央的轻量 overlay
- 非 `window-mode` 仍然保留原来的说明型结构，避免这次把普通页面一起打碎

3. `window-mode` 的 CSS 模型

- `engine-host` 改成更接近 fill-parent 容器
- `engine-stage` 在 `window-mode` 下直接占满可用高度
- `foliate-view` 在 `window-mode` 下也跟着吃满父容器
- 去掉 `paper-header` 和额外边框在独立阅读窗里的干扰

## 你可以学到的具体知识

### 1. 阅读器主舞台和普通页面内容区，不应该用同一套盒模型

普通页面常见写法是：

- 外层 padding
- 中间卡片
- 卡片里再放真实内容

但阅读器不是这样。

阅读器的正文区更接近：

- 外层容器负责占满窗口
- 真正的 viewer 直接吃满主舞台
- 工具条、进度条、注释层作为 overlay 叠上去

这也是为什么 `Readest` 的 `BooksGrid` 会更像一个 `relative h-full w-full` 的舞台，而不是文档流里的几块卡片。

### 2. 当你看到“中间内容很窄、右边很空”时，先怀疑布局模型，不要先怀疑单个宽度值

这种问题很容易让人去调：

- `max-width`
- `padding`
- `gap`

但如果结构本身是“卡片套卡片”，你怎么调都只是在错的模型上抛光。

一个很实用的排查顺序是：

1. 先看主内容是不是 `fill parent`
2. 再看有没有多余中间层在限制宽度
3. 最后才调具体 spacing

这次就是典型例子。真正的问题不是某个 `12px`，而是 `window-mode` 里还保留了 `engine-paper` 这层中间舞台。

## 这次怎么验证

我实际跑了：

```bash
pnpm -C /Users/dev/workspace2/hc_apps/br1 check
git -C /Users/dev/workspace2/hc_apps/br1 diff --check
```

结果：

- `pnpm check` 通过
- `git diff --check` 通过

## 还没包括什么

- 这次没有继续把 sidebar 行为翻成 `Readest` 的 pin / resize / overlay 模式
- 这次也没有处理 library 假书导致的“点了不是真导入”的问题
- 右侧 bridge 在独立阅读窗里虽然默认收起了，但还没有做成成熟的可展开面板
