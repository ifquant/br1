# 0179: 用显式进度字段驱动 library 的阅读分区

## 这次改了什么

这一步继续收 `03-02`，目标不是加新界面，而是把 library 的阅读工作流判断从“展示字段猜测”改成“显式状态输入”。

之前 `continue reading / recent reading / 主书架` 的分流主要依赖：

- `readingStatusLabel`
- `progressPercentLabel`

这两个字段虽然能显示，但它们本质上还是偏展示层的字符串。  
如果后面 reader 写回契约继续演进，library 再继续拿这些字符串做业务判断，会越来越脆。

所以这次做了三件事：

1. 把 `progressFraction` 提升为 `LibraryShelfBook` 的正式字段
2. 样例数据也补上真实的 `progressFraction`
3. continue/recent/unstarted/finished 的判断统一改走显式 helper

## 为什么这样改

### 1. 展示字段不应该反向决定业务分桶

比如之前这种判断：

```ts
book.readingStatusLabel !== '已读完'
book.progressPercentLabel !== '0%'
```

问题在于：

- 它依赖中文文案
- 它依赖格式化后的百分比字符串
- 一旦文案改名、百分比展示策略变化，业务规则也会被意外改坏

这类字段更适合“给用户看”，不适合“给状态机判断”。

### 2. library 应该直接消费 reader 持久化回来的原始信号

reader 真正稳定写回的是：

- `progressFraction`
- `lastOpenedAt`
- `status`

所以 library 的工作流规则更应该长这样：

- `hasBookBeenOpened(book)`
- `isBookInProgress(book)`
- `isBookFinished(book)`
- `isBookUnstarted(book)`

这次就是把这几个 helper 明确写出来了。

## 现在这套规则是什么

### 继续阅读

满足：

- 读过
- `progressFraction > 0`
- `progressFraction < 1`

也就是说，它只包含真正“正在读但没读完”的书。

### 最近阅读

满足：

- 读过
- 但不在 `继续阅读` 里

所以它现在会承接：

- 已读完的书
- 打开过但没有进入有效阅读进度的书

### 主书架

主书架展示的是“当前不在阅读工作流前两层里的剩余条目”，避免一本书同时出现在多个 section 里。

## 你可以学到什么

### 1. 最稳的 UI 规则，通常来自归一化 helper，而不是直接写 if

把复杂判断拆成：

- `isBookInProgress`
- `isBookFinished`
- `isBookUnstarted`

有两个好处：

- 以后业务变了，只改 helper
- 调试时也更容易发现是哪一个分类条件错了

### 2. 类型里加一个字段，往往比继续“推断”更稳

如果你已经有原始数据源，比如这里的 `progressFraction`，那最好的方式通常不是反复从 `%` 字符串再解析回来，而是：

- 直接把原始字段保留到 view model
- 展示字段只负责展示

这样系统的“真相来源”会更清晰。

## 这次实际验证

我实际跑了：

```bash
pnpm check
pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'opens the first library book in a separate reader window'"
git diff --check
```

结果：

- `pnpm check` 通过
- `library-smoke` 通过
- 现有桌面 reader window 回归通过
- `git diff --check` 通过

## 这次还没做

这一步只是把排序输入契约收紧，还没有：

- 增加专门验证“reader 返回 library 后 section 顺序立刻变化”的桌面自动化
- 把这些 helper 再下沉成独立的 `library workflow` service/module
- 处理更复杂的跨窗口实时同步

下一刀可以继续补 focused regression，让这套契约不只是在代码里清楚，也在自动化里被锁住。
