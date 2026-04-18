# 0209 把 TXT 做成可验证的“计划内未实现”错误面

## 这次改动想解决什么

上一刀已经把格式合同收紧了：

- `CBZ` 进入正式输入边界
- `TXT` 被标成“规划内但未实现”

但那时还有一个问题：

- 这个语义主要存在于内部判断
- 用户真正打开 `.txt` 时，未必能稳定看到“计划内未实现”
- web 模式下甚至没有和窗口模式等价的错误展示

这会让产品语义重新变模糊：

- 工程师知道 `TXT` 是 planned
- 用户看到的却可能只是 generic failure

所以这次的目标不是实现 `TXT` 阅读，而是把它的**降级语义做成可见、可测、可回归**。

## 做了什么

### 1. 把格式合同从“能判断”推进到“能产出稳定结论”

这次在 `src/lib/reader/formats.ts` 里新增了 `getReaderFormatSupportStatus()`。

它把格式分成三类：

- `supported`
- `planned`
- `unsupported`
- 另外保留 `unknown`

这样 `ReaderViewport` 就不需要自己分别猜：

- 什么叫正式支持
- 什么叫规划内未实现
- 什么叫根本不支持

而是直接消费统一判断结果。

### 2. 让 `asset` 打开路径也走同一套格式预检查

之前 `ReaderViewport` 的显式格式预检查主要只覆盖 `File` 输入。

这意味着：

- 本地选文件时可能会命中 planned/unsupported 语义
- 但通过 route 打开的 `asset` URL，不一定会在进入底层打开前先被挡住

这次把格式预检查提前成：

- 先推断格式标签
- 再统一判断 `supported / planned / unsupported`
- 最后才决定是否真的调用 `foliateViewElement.open()`

这样 `.txt` 的 asset 路径也会稳定落到：

- `TXT support is planned for br1 but not implemented yet`

### 3. 补齐 web 模式下的 reader 错误展示

之前 `ReaderViewport` 的窗口模式有比较完整的 stage error 展示，
但非窗口模式下，如果打开失败，正文区只剩一段静态说明 copy。

这次把非窗口模式也补齐成：

- 能显示 `Failed to open ...`
- 能显示具体 `stage-error`

这一步非常关键，因为如果 web 模式看不到错误面，再好的内部合同也没有产品意义。

### 4. 新增一个最小 `.txt` 样本，只用来跑错误面回归

这次新增：

- `static/samples/sample-book.txt`

它不是为了“提供样书阅读体验”，而是为了给 planned-format 路径提供一个稳定输入。

这样回归测试不需要依赖：

- 本地用户文件
- 外部服务
- 环境里的随机资产

### 5. 补一条真正能证明产品语义的 web 回归

这次在 `tests/e2e/library-smoke.spec.ts` 里新增了第二个测试：

- 访问 `/reader?source=asset&url=/samples/sample-book.txt...`
- 断言页面会显示：
  - `Failed to open Sample TXT Book`
  - `TXT support is planned for br1 but not implemented yet`

这个测试的意义不是“TXT 可读”，而是：

- `TXT` 当前还不可读
- 但降级语义已经从代码内部状态变成了明确产品行为

### 6. feature audit 也同步补上证据

`.planning/FEATURE-PARITY-AUDIT.md` 现在不只是写：

- `TXT` 在 scope 内但未实现

还会直接引用这条 reader 错误面和对应测试，说明：

- 这是当前正式产品边界的一部分
- 不是口头计划

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
git diff --check
```

结果：`PASS`

## 这次顺手能学到的编程知识

### 1. 降级语义也应该被当成正式产品能力

很多人只把“成功路径”当功能，失败路径只是顺手报个错。

但在格式支持这种问题上，失败语义本身就是产品的一部分：

- 是否支持
- 是否未来会支持
- 是否只是当前版本没做

这些都应该稳定、明确、可测试。

### 2. 同一个能力不要让不同入口走不同规则

如果本地 `File` 打开和 route `asset` 打开走的是不同判断路径，就会出现：

- 一个入口报“planned”
- 另一个入口掉到底层异常

用户不会觉得这是“技术差异”，只会觉得产品边界不一致。

所以这次真正有价值的地方，是把判断规则前移并统一了。

## 还没有处理什么

- 这一步没有让 `TXT` 变成可读格式
- 没有证明 `FB2/MOBI/AZW3/CBZ` 已经有端到端阅读验证
- 也没有开始做 OS 级文件关联注册

这一步只是把 `P0-1` 里的“计划内未实现格式”收成了一个真实、可回归的产品错误面。
