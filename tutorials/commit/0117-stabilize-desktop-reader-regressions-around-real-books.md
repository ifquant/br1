# 0117: 稳定 desktop reader 回归，用“真实可读书”替代“第一本书”

这次提交不是在加新功能，而是在修测试基线。

之前 `br1` 的桌面回归里有一个结构性问题：

- 很多用例默认“第一本书一定能打开”
- 很多重开逻辑默认“library tile 的 href 永远不变”
- 很多窗口切换默认“所有 window handle 都还有效”

这几个假设在真实书库里都不稳，所以测试会出现这种现象：

- 单条测试偶尔过
- 全量跑的时候随机失败
- 失败信息像产品 bug，但根因其实是测试夹带了错误前提

## 这次做了什么

### 1. 不再直接信任“第一本书”

`e2e/app.e2e.ts`

这次把 reader 相关测试的选书逻辑收敛成两层：

- `findStableEpubBook()`
- `openUsableReaderBook({ requireCfi })`

核心思路不是“找第一本 EPUB”，而是：

- 先只考虑 EPUB
- 再真正打开
- 再等它暴露出 metadata
- 如果某条测试还需要 CFI，就继续等到 CFI 存在
- 不满足条件就关掉这个 reader，换下一本

这比“按列表顺序取第一本”更接近真实用户路径，也更符合桌面回归的目标。

## 2. 不再用完整 href 作为“同一本书”的主键

以前重开同一本书时，测试会直接匹配完整 `href`。

问题在于 library tile 的 `href` 里不只有 `path`，还常常带着：

- `fraction`
- `label`
- 其他会随阅读状态更新的 query 参数

所以看起来像“同一本书”，但完整 `href` 其实已经变了。

这次把重开逻辑统一改成：

- 用底层 `path` 找回同一本书

也就是：

- 业务身份：`path`
- 展示/恢复参数：`fraction` 等 query

这比拿整个 `href` 当主键更稳。

## 3. 不再抓住旧 DOM 节点反复读属性

桌面 library 页面在测试过程中会重排、刷新、更新阅读进度。

如果测试早早拿住一批 WebDriver element，然后后面继续：

- `getAttribute('href')`
- `click()`

就很容易遇到 stale element / JS exception。

这次改成：

- 先快照当前 library 里所有可打开书的 `href`
- 之后需要点哪本书时，再用 `href` 回查一个新的 element

也就是把：

- “元素对象”

改成：

- “稳定的字符串 key + 临时回查元素”

这在 UI 自动化里通常更稳。

## 4. window handle 也要按“不可靠外部资源”处理

这次还顺手把 `switchToLibraryWindow()` 做成了等待式、容错式：

- 不再一次扫描失败就直接报错
- 遇到失效 handle 时直接跳过
- 在限定时间内持续尝试找到真正的 library window

因为在桌面应用里，刚关闭 reader 子窗口之后，旧 handle 变成无效值是正常现象。

测试如果把 handle 当成“永远有效”，很容易把窗口生命周期问题误判成产品问题。

## 5. note 回归的断言更贴近用户可见结果

之前有些断言直接要求：

- `.note-body` 必须存在

但这其实是在测试某个 DOM 细节，而不是测试用户是否真的看到了那条笔记。

这次改成：

- 读整张 `note-card` 的可见文本
- 判断里面是否同时包含期待的 `text` / `note`

这更像是在验证：

- “用户看得到正确内容”

而不是：

- “某个内部节点刚好没变名”

## 这次学到的两个编程点

### 知识点 1：E2E 里“真实身份”和“展示 URL”要分开

像这类 library -> reader 的桌面应用，经常会把很多状态编码进 URL。

但这些 URL 参数里通常混着两类信息：

- 资源身份：比如 `path`
- 瞬时状态：比如 `fraction`

如果测试把整串 URL 当身份，就会把瞬时状态漂移误判成“找不到同一资源”。

所以更稳的做法是：

- 用真正稳定的 identity 字段找资源
- 把 URL 其余部分当作状态，而不是主键

## 知识点 2：测试里缓存 element，比缓存 key 更脆

很多 WebDriver 初学者会自然写成：

- `const books = await $$('...')`
- 后面一直复用 `books[0]`

但 UI 一旦：

- 重排
- 重渲染
- 节点被替换

旧 element 就可能变成 stale handle。

更稳的模式通常是：

1. 先缓存稳定 key
2. 每次操作前再查一次当前 DOM

这和后端里“缓存主键，不缓存悬空引用”是同一种思路。

## 这次验证

实际跑过：

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `bash /Users/dev/workspace2/hc_apps/br1/scripts/automation/test-tauri-webdriver.sh "pnpm -C /Users/dev/workspace2/hc_apps/br1 exec wdio run /Users/dev/workspace2/hc_apps/br1/wdio.conf.ts --spec /Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts --mochaOpts.grep 'migrates legacy browser notes into the host-side book store when reopening a book'"` 
- `bash /Users/dev/workspace2/hc_apps/br1/scripts/automation/test-tauri-webdriver.sh "pnpm -C /Users/dev/workspace2/hc_apps/br1 exec wdio run /Users/dev/workspace2/hc_apps/br1/wdio.conf.ts --spec /Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts"`

最终 `e2e/app.e2e.ts` 为 12 passing。
