# 0238: 避开 FB2 标题页文本，收稳 desktop annotation regression

这次没有扩新的 annotation 能力，只修一类很具体的回归脆弱点：`FB2` 的 desktop annotation regression 有时会先选到标题页文本，而不是正文段落。

## 问题是什么

现有的 `FB2` fixture 结构很简单：

- 书名：`Bridge Reader Sample FB2`
- `body > title`
- `section > title`
- 然后才是正文段落

在 desktop reader 里，选区 helper 会从可见 foliate 文本节点里找“第一段足够长的文本”。  
这会导致一个很实际的问题：

- 有时它先抓到书名
- 或者抓到 `Chapter 1`

但这些文本并不会稳定进入 notes workspace 的正文批注链路，于是 regression 会表现成：

- helper 返回了文本
- notes panel 仍然显示 `未选中文本`
- 高亮/笔记按钮还是 disabled

也就是说，问题不在 annotation 存储，而在测试选区落点不够干净。

## 这次改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

### 1. 给 foliate selection helper 增加排除文本能力

`selectVisibleFoliateTextInReader()` 现在新增了第三个维度：

- 允许调用方传入一组 `excludedTexts`

helper 在遍历可见文本节点时，会先把候选文本做一次归一化，然后跳过这些明确不该作为正文批注起点的文本。

这意味着它不再只是“选第一段看起来够长的文本”，而是开始支持“避开已知的非正文落点”。

### 2. FB2 regression 显式排除标题页文本

在 `persists FB2 highlights and notes separately through the desktop reader store` 里：

- 先读取当前 book card 标题
- 然后把
  - 书名
  - `Chapter 1`

都作为 `excludedTexts` 传给 helper

这样 `FB2` 的首个选区会更稳定地落到正文段落，而不是标题页。

## 为什么这刀只修测试，不改产品代码

因为这里暴露出来的不是 reader 产品行为 bug，而是 regression 取样不够干净：

- 用户真实阅读时不会靠自动 helper 去“随便选一段文本”
- 只有自动化回归才需要从页面上机械地挑一个稳定起点

所以这刀最合理的落点就是：

- 修测试选择策略
- 不碰 reader runtime

这样范围干净，也不会把“FB2 annotation 证据”这条线和“产品 annotation 行为”混成一锅。

## 这刀的意义

它把 `FB2` 这条已经有的 desktop annotation 证据从“偶发被标题页干扰”推进到了更稳定的状态。

也就是说，后续如果要继续做：

- `FB2` 的 filter-management 证据
- 更大范围的 secondary-format annotation matrix

现在至少不用再被标题页文本这种低层噪音反复打断。

## 验证

本次实际运行：

```bash
pnpm check
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists FB2 highlights and notes separately through the desktop reader store' --mochaOpts.timeout 120000"
git diff --check
```

结果：

- `PASS`
- `PASS`
- `PASS`
