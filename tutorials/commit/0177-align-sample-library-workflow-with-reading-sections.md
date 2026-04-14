# 0177: 让样例书库也按真实阅读工作流分区

## 这次改动做了什么

这一刀处理的是 `library` 的样例路径，也就是没有桌面书库时网页里那套预览数据。

之前桌面模式已经有：

- `继续阅读`
- `最近阅读`
- `你的书库`

三层分区，但样例路径还是旧的静态壳子，所以 smoke 一旦开始按真实工作流断言，就会出现“桌面和 web 看起来不是同一个产品”的问题。

这次把样例数据也接进同一套规则：

- 给样例书补齐 `lastOpenedAt / importedAt / progressPercentLabel / readingStatusLabel`
- 用和桌面一致的 `getContinueReadingBooks()` / `getRecentReadingBooks()` / `getLibraryShelfBooks()` 分流
- 样例路径也能显示 `继续阅读 / 最近阅读 / 你的书库`
- 搜索时也切到统一的 `搜索结果` section

另外修掉了一个隐蔽 bug：

- 样例书之前复用了同一个 sample `readerHref`
- `最近阅读` 的去重键又正好使用 `readerHref`
- 结果 `胡雪岩` 这种“最近读过但不在继续阅读里”的条目会被误判掉

所以这次还给每本样例书换成了唯一的 reader target label。

## 你可以学到什么

### 1. 列表去重时，键必须真唯一

这里的 bug 很典型：

```ts
const continueKeys = new Set(continueReading.map((book) => book.readerHref));
```

如果几本不同的样例书共享同一个 `readerHref`，那业务上它们明明不是同一本书，但在去重逻辑里就会被当成同一个实体。

结论：

- 用来去重的 key，必须代表“业务实体身份”
- 不能只是“碰巧可用的字段”

### 2. 样例数据不是装饰，它其实是产品契约的一部分

很多项目里，sample/mock 数据只拿来“把页面撑起来”，最后它和真实数据模型越走越远。

这会带来两个问题：

- smoke 测的是假产品
- 设计调整只能在真实环境验证，开发反馈会变慢

更稳的做法是：

- 样例数据尽量复用真实的数据结构
- 样例路径尽量复用真实的派生逻辑

这样 web 预览和桌面产品的行为差异才不会越来越大。

## 这次怎么验证

我实际跑了：

```bash
pnpm check
pnpm exec playwright test tests/e2e/library-smoke.spec.ts --reporter=line
git diff --check
```

结果都是通过的。

## 还没做的事

这一步只收了 Phase 3 里 `03-01` 的样例工作流一致性，没有继续推进：

- `03-02` 的 reader shell / window 行为收口
- `03-03` 的窗口状态与 chrome 细节对齐

下一步就可以继续进入 `Phase 3` 的 reader/window 主线。
