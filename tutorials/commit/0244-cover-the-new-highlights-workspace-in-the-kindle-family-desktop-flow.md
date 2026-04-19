# 0244: 给新的 highlights workspace 补 Kindle-family desktop 证据

这次把 `highlights workspace` 的 desktop 证据线继续推到最后一块主要文本格式族：

- `MOBI`
- `AZW3`

scope 仍然保持不变：

- 不改 UI
- 不加功能
- 只补 regression 和文档

## 为什么这刀是顺势收口

前面三刀已经把独立 `高亮` workspace 的证据一路铺到了：

- web `TXT`
- desktop `TXT`
- desktop `EPUB`
- desktop `FB2`

剩下最明显的空档就是 Kindle-family。  
而这条线本身已经有现成 regression：

- `persists MOBI and AZW3 highlights and notes separately through the desktop reader store`

它已经验证了：

1. 创建高亮
2. 创建笔记
3. reopen 后两条都还在
4. `高亮 / 笔记 / 全部类型` kind filter 正常工作

所以这次并不需要再搭新测试结构，只要把独立 `高亮` tab 的断言接进去，就能把整条 highlights workspace desktop 证据链收成完整一套。

## 这次改了什么

### 1. 扩现有 Kindle-family desktop annotation regression

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

我继续扩现有的：

- `persists MOBI and AZW3 highlights and notes separately through the desktop reader store`

现在每个 sample 在完成：

- reopen
- kind filter
- 全部类型恢复

之后，还会继续：

1. 切到 sidebar 的 `高亮` tab
2. 等 `highlights panel preview` 出现
3. 断言文案里有 `已保存 1 条高亮`
4. 断言列表只剩一张 `.highlight-card`
5. 断言这张卡仍然对应 reopen 前的那条高亮文本
6. 并且明确不包含同一本书里的 note body

这让 `MOBI/AZW3` 终于进入和 `TXT / EPUB / FB2` 一样的 highlights workspace 证据层级。

## 为什么这刀不再扩别的东西

因为到这里，这条“第一版独立 highlights workspace”的证据链已经很完整了：

- web 最小路径
- desktop TXT
- desktop EPUB
- desktop FB2
- desktop Kindle-family

再继续扩更多内容，比如：

- bulk delete
- bulk export
- header 快捷入口
- highlights 专门排序

都已经属于下一层产品能力，而不再是这条证据链本身。

所以这刀最合理的做法就是：

- 把 Kindle-family 补齐
- 然后停

## 没做什么

这次仍然没有做：

- bulk highlight management
- dedicated highlight sorting
- highlights workspace 额外快捷入口
- CBZ 这类非文本格式的伪对齐

所以它只是让现有的最小独立 highlights workspace 完成跨主要文本格式的 desktop 证据闭环。

## 验证

本次实际运行：

```bash
pnpm check
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists MOBI and AZW3 highlights and notes separately through the desktop reader store' --mochaOpts.timeout 120000"
git diff --check
```

结果：

- `PASS`
- `PASS`
- `PASS`
