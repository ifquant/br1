# 0242: 给新的 highlights workspace 补 EPUB desktop 证据

这次继续沿上一刀的同一条线推进，但只扩到 `EPUB` 主路径，不再碰新的产品功能。

## 为什么下一刀先选 EPUB

`0241` 已经证明了一件事：

- `highlights workspace` 在 desktop `TXT` reader 流里是真的成立

但这还不够，因为真正的主阅读路径不是 plain text，而是 `EPUB`。  
如果 `高亮` tab 只在 `TXT` 上有证据，那它还只是一个“新工作区在最稳路径上没坏”的结论，不是“它已经进入主产品路径”的结论。

所以这刀的目标非常收敛：

- 不改 workspace UI
- 不加 bulk 操作
- 不扩更多格式
- 只把 desktop `EPUB` regression 接到新的 `高亮` tab 上

## 这次改了什么

### 1. 扩现有 EPUB desktop annotation regression

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

我没有新建另一条 `EPUB` regression，而是继续扩原来的：

- `persists epub highlights and notes separately through the desktop reader store`

它原来已经会验证：

1. 创建一条高亮
2. 创建一条笔记
3. 落盘
4. reopen 后两条都还在
5. `全部类型 / 高亮 / 笔记` kind filter 正常工作

现在它还会继续：

1. 点击 sidebar 的 `高亮` tab
2. 等 `highlights panel preview` 真正显示
3. 断言 panel 文案里有 `已保存 1 条高亮`
4. 断言列表只剩一张 `.highlight-card`
5. 断言这张卡仍然对应 reopen 前那条高亮文本
6. 并且明确不包含 `desktop epub note body`

这就把新 workspace 从：

- `TXT` desktop 证据

推进到了：

- `TXT + EPUB` desktop 证据

而且 `EPUB` 这条还是主阅读路径，价值比继续扩 `TXT` 更高。

## 为什么还是不顺手补别的格式

因为 `EPUB` 这刀的价值已经足够高：

- 它是主阅读格式
- 它能说明新 workspace 不是 plain-text 特例
- 它仍然复用现有回归链，不会把 scope 膨胀成一轮 annotation 扩建

如果这刀再顺手补：

- `FB2`
- `MOBI/AZW3`
- bulk management
- 新 workspace 快捷入口

就又会把一次验证切片扩成产品面改造。现在这样切更稳。

## 没做什么

这次刻意没有做：

- `FB2` desktop highlights workspace 回归
- `MOBI/AZW3` desktop highlights workspace 回归
- header 上新增高亮入口
- bulk delete / bulk export
- highlight 专门排序或筛选

所以这刀只是把 `highlights workspace` 的 desktop 证据推进到了 `EPUB` 主路径，不是开启下一阶段功能设计。

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
