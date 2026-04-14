# 0197: 让 PDF 恢复回归按 `progressFraction` 判定，而不是被 `0%` 文案误杀

这次切片修的是一条很具体的测试误判。

问题不是：

- PDF 没恢复

而是：

- PDF 实际已经恢复到一个很小但有效的位置
- 但 footer 里的百分比会被四舍五入成 `0%`
- 测试把 `progressLabel !== '0%'` 当作成功条件
- 于是把真实成功误判成失败

这类问题很典型。  
不是产品状态错了，而是“测试拿了一个太粗的 UI 文案当真信号”。

## 这次改了什么

文件：`e2e/app.e2e.ts`

### 1. seeded PDF 重开后的等待条件，改成看 `progressFraction`

之前 reopen 后的等待条件是：

- 有标题
- 格式是 PDF
- `progressLabel !== '0%'`

这对 EPUB 勉强还能凑合。  
但对 PDF，尤其页数很多、只翻到很前面的时候，`fraction` 可能已经是：

- `0.008`
- `0.011`

这明明是有效进度，  
可 UI 百分比仍然可能显示：

- `0%`

所以现在改成：

- 优先看 `progressFraction > 0`
- 或者至少 `locationLabel !== 'Not opened'`

也就是说，判定从“显示文案”转回“真实状态值”。

### 2. 最终几何断言里的恢复判断，也改成比较 fraction

之前 `restoredByFraction` 是这样判断的：

- `details.progressLabel !== Math.round(expectedFraction * 100) + '%'`

这很脆。  
因为两个不同的 fraction 只要都被 round 到 `0%`，测试就看不出差别。

现在改成：

- 直接比较 `details.progressFraction` 和 `expectedFraction`
- 允许一个很小的误差阈值 `0.0005`

这更符合恢复逻辑本身：

- 恢复是定位问题
- 应该看定位值
- 不该看四舍五入后的展示字符串

### 3. 进入最终断言前，不再要求 `progressLabel !== '0%'`

最终主断言现在只排除：

- 没 title
- `locationLabel === 'Opening book'`
- 不是 PDF

然后把：

- `progressFraction > 0`
- 或 `locationLabel !== 'Not opened'`

作为有效恢复信号的一部分。

这样测试不会再因为一个 UI 字符串太粗而挡住真正的状态流。

## 为什么这次修复有效

因为这次修的是“信号层级错误”。

之前测试链路是：

- 真状态：`progressFraction`
- UI 投影：`progressLabel`
- 测试判断：只看 `progressLabel`

而 `progressLabel` 本来就是给人看的粗粒度结果。  
你拿它当自动化断言主信号，尤其还是 PDF 这种进度可能很细的小数场景，迟早误判。

现在变成：

- 真状态：`progressFraction`
- UI 文案：继续显示 `progressLabel`
- 测试判断：优先看 `progressFraction`

这就对了。

## 这次顺手能学到的知识

### 知识点 1：自动化测试最好断言“状态源”，不要只断言“展示文案”

像：

- `0%`
- `已完成`
- `加载中`

这种字符串，通常是展示层压缩过的信息。

它适合做：

- 冒烟测试
- 可见性测试

但不适合做：

- 精细恢复
- 几何同步
- 定位一致性

如果代码里能拿到更底层的真实值，比如：

- `fraction`
- `cfi`
- `status enum`
- `timestamp`

优先断言这些。

### 知识点 2：四舍五入是 UI 友好，不是测试友好

用户喜欢 `0% / 1% / 23%` 这样的文案。  
但测试需要的是：

- `0.008298...`
- `0.011428...`

这两个数字对用户都可能看成 `0%`，  
但对恢复逻辑来说完全不是一回事。

所以一个很常见的工程原则是：

- UI 层可以 round
- 状态层不要 round
- 测试尽量站在状态层

## 相关文件

- `e2e/app.e2e.ts`

## 本次验证

- `pnpm check` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'reopens a library-file pdf with restored progress inside the reader stage' --mochaOpts.timeout 120000"` (PASS)
- `git diff --check` (PASS)
