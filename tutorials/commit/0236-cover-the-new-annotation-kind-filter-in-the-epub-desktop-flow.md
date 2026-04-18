# 0236: 给新的 annotation kind filter 补 EPUB desktop 证据

这次继续沿 annotation 管理面往前推，但仍然不扩新 UI。目标只有一个：把刚做出来的 `全部类型 / 高亮 / 笔记` 筛选，从 `TXT` desktop 路径再推进到主 `EPUB` 阅读路径。

## 为什么还要继续补

前一刀已经证明：

- 这个类型筛选不是纯前端按钮
- 它在真实 desktop `TXT` reader + host-side store 里能工作

但如果只停在 `TXT`，它仍然更像一个 plain-text 特例证明。  
`EPUB` 才是 `br1` 当前最核心、最像 Readest 的主阅读路径，所以 annotation management 要想算真正前进一步，至少还需要在 `EPUB` 上也拿到同等级证据。

## 这次改了什么

### 1. 抽出共享的 desktop kind-filter click helper

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

把之前内嵌在 `TXT` regression 里的 filter click 逻辑提升成了共享 helper：

- `clickAnnotationKindFilter('全部类型' | '高亮' | '笔记')`

这样后面 `EPUB` 可以直接复用，不用重复把 DOM 查询和 click 逻辑粘一次。

### 2. 扩现有 EPUB desktop annotation regression

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

我没有新增一条额外的 `EPUB` 管理测试，而是直接扩现有的：

- `persists epub highlights and notes separately through the desktop reader store`

在原本“创建高亮 + 创建笔记 + 落盘 + reopen”都通过之后，再继续验证：

1. 点 `高亮`
   - meta row 进入 `仅看高亮`
   - 列表只剩高亮卡片

2. 点 `笔记`
   - meta row 进入 `仅看笔记`
   - 列表只剩笔记卡片

3. 点 `全部类型`
   - meta row 回到 `全部类型`
   - 两条 annotation 都回到列表

这意味着现在：

- `TXT` desktop 路径有类型筛选证据
- `EPUB` desktop 主路径也有类型筛选证据

所以这个管理层不再只是某个次级格式上的附带行为。

## 这刀的意义

它把 annotation 管理面的可信度从：

- `web + TXT desktop`

推进到了：

- `web + TXT desktop + EPUB desktop`

这很重要，因为 `EPUB` 是当前 annotation 和 reader 主工作流里最有代表性的路径。  
如果 `EPUB` 不过，这层管理面就还不能算真正进入主产品面。

## 没做什么

这刀仍然刻意没碰：

- dedicated highlights workspace
- bulk delete / bulk convert
- 更深的 highlight management
- instant mode
- `FB2/MOBI/AZW3` 的 desktop filter-management 证据

也就是说，它只是把“最小 annotation 管理层”从 TXT 扩到了 EPUB，还不是下一阶段的大型产品化收口。

## 验证

本次实际运行：

```bash
pnpm check
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists epub highlights and notes separately through the desktop reader store' --mochaOpts.timeout 120000"
git diff --check
```

结果：

- `PASS`
- `PASS`
- `PASS`
