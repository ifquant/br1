# 0192: 稳定 reader 打开几何与可见内容回归

## 这次改动做了什么

这一刀处理的是 `04-01` 里最顽固的一类问题：书其实已经打开了，但桌面 reader 的正文分页有时会落到不对的几何位置，自动化回归也会把离屏列或无文字封面误判成“主舞台空白”。

这次做了两件事：

1. 调整 reader 的初始打开语义
2. 收紧桌面几何回归，让它只看真正可见的内容

---

## 1. 为什么不能把“没有恢复位置”都当成 `goToFraction(0)`

之前的逻辑是：

- 如果有 `restoreLocation`，尝试恢复
- 否则直接 `goToFraction(0)`

这个写法看起来简单，但它把两种不同语义混在了一起：

- “恢复到以前读到的位置”
- “第一次打开这本书，应该落到正文起点”

`foliate-view` 自己其实已经提供了这两个入口：

- `init({ lastLocation })`
- `init({ showTextStart: true })`

所以这次把逻辑改成：

- 有 `restoreLocation`：先走 `init({ lastLocation })`
- 恢复失败但有 `restoreFraction`：退回 `goToFraction(restoreFraction)`
- 两者都没有：走 `init({ showTextStart: true })`

这样更接近阅读器本来的打开语义，也更接近 Readest 的行为。

## 2. 为什么原来的几何回归会误报

EPUB 的分页不是把每页都拆成一个独立 DOM，而是常常把整段正文做成多列布局。

所以自动化如果直接拿：

- 整个 iframe 的外框
- 文本节点的任意 client rect

就会把这些情况误当成当前可见页：

- 离屏列里的文本
- 预加载 section 里的文本
- 首屏是封面图、插图，没有正文文字

这次把回归逻辑改成：

- 先按 `foliate-paginator` 的 `#container` 求真实可见窗口
- 只接受落在这个可见窗口内的 rect
- 优先找可见文本
- 如果首屏没有文字，再接受可见的 `img/svg/canvas/video`

这样测试检查的是“用户现在真能看到的内容”，不是内部离屏布局。

## 3. 这次顺手学到的编程知识

### 知识点 1：回归测试不要直接绑定内部实现的“全量几何”

像 iframe、多列排版、虚拟列表、预加载容器这类系统，经常会让“DOM 真实尺寸”和“用户真正看到的尺寸”完全不同。

测试如果直接断言：

- 元素总宽度
- 原始 DOM rect

很容易误报。

更稳的做法是：

- 先找“可视窗口”
- 再把内容坐标映射到这个窗口里
- 最后只断言用户实际看到的东西

### 知识点 2：默认打开路径和恢复路径通常不是同一套逻辑

很多 UI bug 都来自“图省事，把第一次打开和恢复打开合并成一个 API”。

但这两种语义通常完全不同：

- 第一次打开：更像“找一个合理起点”
- 恢复打开：更像“精确回到旧锚点”

如果混用，最常见的问题就是：

- 首屏落点不自然
- 恢复失败后回退策略奇怪
- 调试时看起来像“随机滚动”

---

## 4. 这次如何验证

实际跑过：

```bash
pnpm check
```

结果：`PASS`

```bash
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'keeps the rendered book page inside the reader stage instead of the sidebar column'"
```

结果：

- 目标 spec `PASS`
- 包装脚本 teardown 仍然返回 `ELIFECYCLE`

```bash
git diff --check
```

结果：`PASS`

## 5. 这次还没处理什么

- 依赖“本地书库里必须有已保存恢复位置的 EPUB”的那条恢复回归，这次环境里仍然没有稳定样本
- `PDF` 打开链路没有混进这次切片
- reader 的视觉 polish 也没有混进来，这一刀只处理打开语义和几何回归
