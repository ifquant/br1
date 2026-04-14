# 0201 稳定 EPUB 主舞台回归与 reader 打开错误语义

## 这次改动想解决什么

`br1` 的两条 focused EPUB 桌面回归当时都失败了，但失败原因其实不完全一样：

1. 第一条用例打开到的是图像页，测试只认“第一段可见正文文本”，于是把一本已经正确落在主舞台里的书误判成失败。
2. 第二条恢复用例里，`foliate-paginator` 内部 iframe 仍然可能非常宽，但真正可见的阅读窗口已经被裁到了正确宽度。测试却还在拿内部整张超宽渲染面做几何断言，导致误报。

另外，`ReaderViewport` 在打开失败时只把底层报错原样塞到界面里，用户看到的是技术性异常，而不是可操作的失败语义。

这次的目标是：

- 让 EPUB focused regression 判断“真正可见的阅读内容”，而不是被内部实现细节误导
- 让 reader 在打开失败时给出更可诊断的错误说明
- 在打开和恢复后，给布局多一点 settle 时间，减少刚打开时的瞬时几何抖动

## 做了什么

### 1. 给 reader 打开流程加了一层错误语义归一化

在 `ReaderViewport.svelte` 里新增了 `normalizeReaderOpenFailureMessage()`。

它会把几类常见失败改写成更适合界面展示的话：

- `library-file` 但不在 Tauri desktop 环境
- `makeBook()` / 书籍预处理失败
- `PDF vendor assets` 缺失
- 明确的 unsupported source

这样 stage error 不再只是一个生硬的底层异常字符串。

### 2. 在 open 之后等待布局 settle，再重新配置分页参数

`foliate-view` 打开和 `init()` 恢复位置后，内部分页容器并不会立刻稳定。

这次新增了一个很小的等待：

- 连续两个 `requestAnimationFrame`
- 然后再跑一次 `configureFoliatePreview()`
- 再等一次 settle

这样 reader 的初始几何更接近最终稳定状态。

### 3. 回归测试从“只认正文文本”升级成“识别真实可见内容”

在 `e2e/app.e2e.ts` 里，`readReaderGeometry()` 现在除了找 `firstVisibleTextRect`，还会继续找：

- `img`
- `svg`
- `canvas`
- `video`
- `picture img`

也就是说，如果某本 EPUB 当前页是封面页或插图页，只要真实可见内容落在正确的 reader stage 里，回归就会接受它。

### 4. EPUB 恢复回归不再把“CFI 恰好相同”误判成失败

之前恢复用例要求：

- `details.cfi` 必须存在
- 而且必须和 `expectedLocation` 不相等

这其实不合理。因为如果持久化的恢复位置本来就是一个精确 CFI，那么 reopened 后拿到同一个 CFI 反而说明恢复成功。

这次改成：

- 如果原本存在 `expectedLocation`，那 reopened 后只要求 `details.cfi` 存在
- 几何是否正确，继续由可见舞台断言决定

## 验证

实际跑过：

```bash
pnpm check
```

结果：`PASS`

```bash
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'keeps the rendered book page inside the reader stage instead of the sidebar column|restores a library-file epub into a visible reading position inside the reader stage' --mochaOpts.timeout 120000"
```

结果：两条 focused EPUB 桌面回归都 `PASS`

```bash
git diff --check
```

结果：`PASS`

## 这次顺手能学到的编程知识

### 1. “内部渲染面很大”不等于“用户看到的界面错了”

很多分页阅读器内部会把多个列或多个页面铺成一张更大的渲染面，再通过容器裁切出当前可见窗口。

所以做 UI 自动化时，常见错误是：

- 直接断言内部 iframe 或 canvas 的总宽度
- 忽略真正可见容器的裁切边界

更稳的做法是：

- 先找“可见 viewport / paginator container”
- 再找真正出现在用户屏幕上的可见文本块或图像块

### 2. 回归测试不应该把实现细节当产品契约

`details.cfi !== expectedLocation` 这种断言，其实把“恢复后内部是否换了一个 CFI”当成了产品成功标准。

但用户真正关心的是：

- 能不能恢复到正确位置
- 内容是不是落在正确主舞台
- 有没有真的可见内容

测试如果绑死实现细节，产品没有坏，测试也会红。这类红灯很吵，但没价值。

## 还没有处理什么

- 这一步没有继续扩 `PDF`
- 没有处理 reader shell 的视觉对齐
- 也没有开始 `04-03` 的跨格式打开服务收口
