# 0251: 给 highlights multi-select 补 FB2 desktop 主路径证据

这次没有再扩新功能，而是把上一刀刚推进到 `EPUB` 主路径的 `highlights` multi-select 删除路径，继续落到了 `FB2` 的 desktop reader 回归里。

## 为什么这刀值得单独补

到 `0250` 为止，这条能力已经能证明：

- `TXT` 上能选中部分高亮再删除
- `EPUB` 主路径也能做同样的事

但还缺一个很关键的 secondary-format 证明：

- `FB2`

`FB2` 不是 plain text，也不是 EPUB 主路径。  
如果它也能稳定跑通这条管理链，就说明 multi-select 不再只是某一个 reader surface 的特例，而是在更多 text-capable formats 上开始成立。

## 这次改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

我继续扩现有的：

- `persists FB2 highlights and notes separately through the desktop reader store`

### 1. 把 FB2 场景从 `1 高亮 + 1 笔记` 升级成 `2 高亮 + 1 笔记`

和前一刀在 `EPUB` 上做的一样，这次 `FB2` 也改成：

1. 第一段正文做高亮
2. 第二段正文再做一条高亮
3. 第三段正文再记一条笔记

这样后面的 partial delete 才不是假动作。

### 2. 在独立 highlights workspace 里验证 oldest-first + partial delete

reopen 后，这条 regression 现在会继续：

1. 进入 `高亮` tab
2. 确认当前有两条高亮，不混入 note body
3. 切到 `最早添加`
4. 断言第一张卡片变成最早那条高亮
5. 选中这一条最早高亮
6. 执行 `删除选中高亮`
7. 断言：
   - 只剩一条高亮
   - 留下的是另一条高亮
   - 选中状态清空

### 3. 最后保留整屏 bulk delete 收尾

为了不丢掉前面已经锁住的契约，这条线最后仍然会：

1. 切回 `最近添加`
2. 执行 `删除当前视图高亮`
3. 回到 `笔记`
4. 断言：
   - `0 高亮`
   - `1 笔记`
   - `desktop fb2 note body` 仍然存在

所以 `FB2` 现在也有了完整的三层闭环：

- highlights / notes split
- partial-selection delete
- visible bulk delete

## 为什么这刀先停在 FB2

因为这次的目的不是把所有格式一口气补齐，而是：

- 用 `FB2` 证明这条管理能力已经跨出 `TXT + EPUB`

这一步一旦成立，下一层再去补 Kindle-family 就更有意义，也更容易把范围控制住。

## 这刀没做什么

这次没有补：

- `MOBI/AZW3` multi-select desktop regression
- selection persistence
- inverse selection
- export / archive

所以它只是：

- multi-select evidence 进入 `FB2` desktop 主路径

不是完整的跨 secondary-format 收口。

## 验证

本次实际运行：

```bash
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists FB2 highlights and notes separately through the desktop reader store' --mochaOpts.timeout 180000"
pnpm check
git diff --check
```

结果：

- `PASS`
- `PASS`
- `PASS`
