# 0256: 把 selected-only highlights 视图推进到 secondary-format desktop 主路径

这次没有再开新的 selection 功能，而是把上一刀刚落在：

- `TXT web`
- `EPUB desktop`

的 `已选高亮` 视图，继续推进到了：

- `FB2`
- `MOBI`
- `AZW3`

也就是让 selected-only workspace 不再只停留在主路径，而开始进入 text-capable secondary-format 的 desktop 主链路。

## 为什么这刀值得单独补

到 `0255` 为止，`highlights` workspace 已经第一次具备了：

- `已选高亮`

这个视图。  
但那时它的证据还是偏主路径：

- `TXT`
- `EPUB`

这会带来一个问题：

- selection set 看起来像是存在了
- 但还不能证明它已经真正进入 secondary-format 的 reader surface

而当前这条 annotation 管理线，目标本来就不是只服务主路径，而是要成为跨 text-capable formats 的统一管理层。

所以这刀的意义很直接：

- 把 `selected-only` 视图从“主路径功能”推进成“secondary-format 也能消费的管理能力”

## 这次改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`
- `/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md`

### 1. 在 shared Kindle-family regression 里补 selected-only 视图

现有的：

- `persists MOBI and AZW3 highlights and notes separately through the desktop reader store`

现在在 `高亮` tab 里不再直接从：

1. 选中第一条
2. 反选
3. 删除选中

开始，而是先加一层：

1. 选中第一条
2. 切到 `已选高亮`
3. 确认：
   - meta row 变成 `1 已选高亮`
   - 列表只剩最早那条高亮
4. 再切回 `全部`
5. 才继续走后面的 `反选 -> 删除选中 -> 删除当前视图`

这样 Kindle-family 现在证明的是：

- selected subset 不只是内部状态
- 它已经能被单独浏览
- 并且切回完整视图后，后续 selection-management 流程还能继续

### 2. 在 FB2 regression 里补同等级视图

`FB2` 的 desktop annotation regression 也补了同样一层：

1. 在 `高亮` tab 里选中第一条
2. 切到 `已选高亮`
3. 确认只剩那条最早高亮
4. 再回 `全部`
5. 再继续走 `反选 -> 删除选中 -> 删除当前视图`

这意味着 `FB2` 也不再只停在：

- split
- partial delete
- invert selection

而是也进入了：

- selected-only view

## 为什么这次不再改运行时代码

上一刀已经把运行时代码补出来了：

- `highlightsFilter = all / chapter / selected`
- selected-only 文案
- selected-only current-view delete 语义

这次没有再继续动 runtime，是因为最值钱的剩余 gap 已经不是“控件有没有”，而是：

- 这条管理能力在 secondary-format 上到底有没有真实证据

所以这次只扩 regression 和审计，不继续改 UI 逻辑。

## 审计表同步了什么

`FEATURE-PARITY-AUDIT.md` 这次只补了一件事：

- `selected-only highlights view` 的证据范围，从：
  - `web TXT + desktop EPUB`
- 更新成：
  - `web TXT + desktop EPUB + desktop FB2 + desktop Kindle-family`

这样总账就不再把 selected-only 视图误写成只覆盖主路径。

## 这刀没做什么

这次没有补：

- selected-only 视图下的独立排序契约
- selected-only 视图下的 bulk delete 专项回归
- cross-chapter selection persistence
- export / archive

所以它只是：

- 把已经存在的 selected-only 工作面推进到 secondary-format desktop 主路径

不是新一轮产品扩张。

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
