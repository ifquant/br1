# 0254: 把 highlights 的反选路径推进到 FB2 和 Kindle-family

这次没有再加新的控件，而是把上一刀刚落在 `TXT + EPUB` 的 `反选当前视图高亮` 路径，继续推进到了：

- `FB2`
- `MOBI`
- `AZW3`

也就是把第一条 invert-selection 管理链，从两条主路径继续推到了 secondary-format desktop 主路径。

## 为什么这刀要单独补

到 `0253` 为止，`highlights` workspace 已经能证明：

- 当前视图高亮可以反选
- 反选后的选择集会被 `删除选中高亮` 真正消费

但那时证据只在：

- `TXT`
- `EPUB`

这还不够。  
因为当前产品面已经明确想把 `highlights` workspace 当成跨 text-capable formats 的统一管理层，而不是只对主路径生效。

所以这刀要解决的是：

- `FB2`
- `MOBI`
- `AZW3`

是否也能稳定消费同样的 selection-management 契约。

## 这次改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`
- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

### 1. 把 shared Kindle-family 回归推进到 invert-selection

现有的：

- `persists MOBI and AZW3 highlights and notes separately through the desktop reader store`

现在在 reopen 后不再只是：

1. 切到 `最早添加`
2. 选中第一条
3. 删除选中高亮

而是改成：

1. 切到 `最早添加`
2. 选中第一条
3. 执行 `反选当前视图高亮`
4. 确认：
   - 第一条变回未选
   - 第二条变成已选
5. 再执行 `删除选中高亮`
6. 确认最终留下的是最早那条高亮

也就是说，Kindle-family 现在证明的是：

- 不是“删掉手动选中的那一条”
- 而是“删掉反选之后留下的那一条”

### 2. 把 FB2 也推进到同等级路径

`FB2` 的 desktop annotation regression 也同步做了同样的升级。

这样 `FB2` 不再只停在：

- highlight / note split
- bulk delete

而是也进入了：

- partial select
- invert selection
- delete selected after invert

### 3. 顺手收紧 FB2 的 title-page 选区过滤

这次真正让 `FB2` 稳下来的关键，不是 UI，而是 regression helper 本身。

之前 `selectVisibleFoliateTextInReader()` 对 `excludedTexts` 的过滤太窄，只跳过：

- `raw === ignoredText`

这会导致 `FB2` title page 上那些“包含标题文本但不是完全等于标题”的节点，仍然会被误选成正文首段。

这次改成：

- `raw.includes(ignoredText) || ignoredText.includes(raw)`

这样 `FB2` title page 上只要还带着标题或章节头的文本块，就会被排除，回归才会稳定落到真正的正文段落。

这不是功能扩张，而是让 secondary-format regression 不再被 title page 噪音误导。

## 审计表同步了什么

`FEATURE-PARITY-AUDIT.md` 这次只同步改了一件事：

- `invert-selection` 的证据范围，不再写成：
  - `web + desktop TXT + desktop EPUB`
- 而是更新成：
  - `web + desktop TXT + desktop EPUB + desktop FB2 + desktop Kindle-family`

这样功能总账和当前回归矩阵保持一致，不会再把这条能力误写成只覆盖主路径。

## 这刀没做什么

这次没有补：

- `CBZ` 这类非 text-capable format 的 annotation parity
- selection persistence
- cross-chapter selection set persistence
- export / archive

所以它只是：

- 把已经存在的 invert-selection 管理链推进到更多 text-capable desktop formats

不是再开一条新的产品线。

## 验证

本次实际运行：

```bash
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists FB2 highlights and notes separately through the desktop reader store|persists MOBI and AZW3 highlights and notes separately through the desktop reader store' --mochaOpts.timeout 240000"
pnpm check
git diff --check
```

结果：

- `PASS`
- `PASS`
- `PASS`
