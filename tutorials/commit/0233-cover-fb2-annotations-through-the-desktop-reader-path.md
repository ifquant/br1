# 0233: 补齐 FB2 的 desktop annotation 闭环证据

本次提交把 secondary text formats 里最后一条明显缺口补上了：`FB2` 现在也和 `EPUB / TXT / MOBI / AZW3` 一样，拥有真实的 desktop reader annotation 回归，不再只是“理论上支持选区”和“web 下能工作”。

## 为什么要补这刀

前面的提交已经把几件关键事拆清楚了：

- `highlights` 和 `notes` 已经是两类真实持久化动作，不再混成一种 note 记录。
- `TXT` 已经有自己的 desktop regression。
- `EPUB` 主路径和 `MOBI/AZW3` 的 foliate 路径也都有 host-side store 证据。

但 `FB2` 还差最后一条最关键的证明：

- 在 desktop `library-file` reader 里选中文本
- 分别创建一条 `高亮` 和一条 `笔记`
- 落盘到 host-side notes store
- 关闭窗口再重开
- 仍然能看到两条独立记录

如果这条不补，`FEATURE-PARITY-AUDIT.md` 里把 `FB2/MOBI/AZW3` 归到同一组 annotation evidence 就站不住。

## 改了什么

### 1. 新增 focused desktop regression

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

新增用例：

- `persists FB2 highlights and notes separately through the desktop reader store`

这条用例复用了现有的 desktop import / open / reopen 工具链，但专门固定在 `FB2` 样本上验证：

1. 通过真实 `import_library_books` 导入 `sample-book.fb2`
2. 从 library 打开对应 `library-file` reader window
3. 在 notes workspace 清空旧记录，避免脏状态串测试
4. 选第一段文本创建 `高亮`
5. 选第二段文本创建 `笔记`
6. 检查 UI 中同时存在一条 `高亮` 和一条 `笔记`
7. 直接读取 host-side notes 文件，确认两条记录已经落盘
8. 关闭重开同一本 `FB2`
9. 再次确认两条 annotation 都还在

这样 `FB2` 的证据级别终于和 `EPUB`、`TXT`、`MOBI/AZW3` 对齐了。

### 2. 同步更新 feature parity 审计

文件：

- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

这里把 annotation 这一行的表述更新成：

- `FB2/MOBI/AZW3` 都已有 matching desktop foliate-reader annotation evidence

同时在详细说明里把“FB2 仍是 gap”的旧结论去掉，避免 planning 总账落后于实际回归覆盖面。

## 这刀的意义

这不是再加一个“格式能打开”的测试，而是把 `P0-3 Annotations and Highlighting` 的 cross-format evidence 补齐一块关键拼图：

- `TXT`：plain-text annotation 路径已覆盖
- `EPUB`：主阅读路径已覆盖
- `MOBI/AZW3`：Kindle-family 路径已覆盖
- `FB2`：secondary text format 路径现在也已覆盖

这样当前真正剩下的 gap 就更清楚了：

- 不是“FB2 到底能不能做 annotation”
- 而是更高一级的 annotation 产品面，例如 dedicated highlight 管理、instant mode、更成熟的跨格式工作区体验

## 验证

本次实际运行：

```bash
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists FB2 highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"
```

结果：

- `PASS`

后续收口时，还会把它并回整组 desktop annotation regression 一起跑，确保 `FB2` 不只是单测通过，而是能在整条注释主线上稳定共存。
