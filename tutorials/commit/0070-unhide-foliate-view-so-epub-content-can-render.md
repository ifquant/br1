# 0070 去掉把 foliate-view 藏起来的样式，让 EPUB 正文重新可见

这次修的不是导入链，也不是 `foliate-js` 本身，而是一个更直接的显示问题。

用户反馈是：

- 点开 `epub` 书以后
- 左侧目录能出来
- 但右侧主阅读区还是空白

这个现象本身已经说明了很多事情：

- 书其实已经被打开了
- `toc` 也已经成功取到了
- 真正的问题更像是“正文区域没有显示出来”

继续对源码后，问题落在 [ReaderViewport.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte) 里一条很直接的样式：

```css
.engine-host :global(foliate-view.foliate-preview) {
  display: none;
}
```

而同一个文件后面又有一组样式在尝试把同一个元素显示出来：

```css
.engine-stage :global(foliate-view.foliate-preview) {
  display: block;
}
```

这就会形成冲突。前面那条规则更早、作用范围更大，而且会把真正承载正文的 `foliate-view` 元素直接藏掉。结果就是：

- 目录和 metadata 还能更新
- 但用户看不到正文

所以这次修复很小，只做了一件事：

- 删除那条把 `foliate-view` 全局隐藏掉的样式

## 改动点

- 删除 [ReaderViewport.svelte](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte) 中 `.engine-host :global(foliate-view.foliate-preview) { display: none; }`
- 保留后面更具体的 `.engine-stage` / `window-mode` 样式，让阅读视图按舞台容器正常显示

## 这次顺手能学到的知识

### 1. “目录能出来但正文空白” 常常说明数据链是通的，问题在视图层

很多时候看到空白页，会下意识怀疑：

- 文件没打开
- 解析失败
- 组件没挂载

但如果 `toc`、书名、章节这些信息已经出现了，那就说明：

- 打开链大概率已经走通
- 问题可能只是某个真正承载内容的 DOM 被隐藏了

也就是说，先看“哪些部分已经成功”，能帮你更快缩小排查范围。

### 2. 大范围全局选择器很容易误伤真正的渲染宿主

像这次这种：

```css
.engine-host :global(foliate-view.foliate-preview)
```

它的作用范围非常大。只要 `foliate-view` 被挂在 `engine-host` 下面，就会被影响。

如果你只是想控制“某个阶段暂时不显示”，更安全的做法通常是：

- 给临时状态加 class
- 或者只在更窄的容器里写样式
- 而不是直接对真正的渲染宿主写全局 `display: none`

否则就很容易出现“逻辑都通了，但 UI 被自己盖住了”。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` `PASS`

## 还没包含

- 这一步只修 EPUB 主舞台的可见性问题，没有处理 PDF 打开链
- 也没有把那批还在实验中的 PDF 调试改动一起提交
