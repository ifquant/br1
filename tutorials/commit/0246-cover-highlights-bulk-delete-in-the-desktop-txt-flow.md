# 0246: 给 highlights bulk delete 补 TXT desktop 证据

这次没有继续扩功能面，只把上一刀已经做出来的 `highlights` bulk delete 补成一条真实的 desktop regression。

## 为什么这刀要单独补

`0245` 已经证明：

- `highlights` workspace 可以删除当前视图里的高亮
- web 路径下删高亮不会误删笔记

但这还不够。  
这个动作真正高频发生的地方，是 desktop reader：

1. 打开一本书
2. 做一条高亮
3. 做一条笔记
4. reopen
5. 进入 `高亮` workspace 清掉当前高亮
6. 回到 `笔记` workspace 继续保留笔记

所以这刀的目标很单纯：  
把这条管理动作从 web 证据推进到最稳的 desktop `TXT` 路径。

## 这次改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

我直接扩原来的这条 focused regression：

- `persists txt highlights and notes separately through the desktop reader store`

原来它已经会验证：

1. 创建一条高亮
2. 创建一条笔记
3. reopen
4. 切到独立 `高亮` tab
5. 确认只剩高亮，不混入笔记正文

这次在这之后继续补了：

1. 点击 `删除当前视图高亮`
2. 接受确认框
3. 断言 `highlights` workspace 进入空态
4. 切回 `笔记`
5. 断言：
   - `0 高亮`
   - `1 笔记`
   - `desktop txt note body` 还在

这条回归现在锁住了两个关键事实：

- bulk delete 只删当前可见高亮
- 已持久化的笔记不会被连带删除

## 为什么仍然先选 TXT

因为这刀验证的是“管理动作的正确性”，不是继续扩格式覆盖。

`TXT` 仍然是最稳的 desktop annotation 路径：

- 选区可控
- fixture 简单
- 没有 reflow / chapter 边界干扰

先用它把 bulk delete 的 desktop 证据锁住，是最值钱的顺序。

## 这刀没做什么

这次没有补：

- EPUB desktop bulk delete regression
- FB2 desktop bulk delete regression
- Kindle-family desktop bulk delete regression
- highlight 排序
- multi-select
- export / archive

所以这只是把第一版 bulk delete 从 web 证据推进到了 desktop TXT 证据，不是更大范围的 highlights management 升级。

## 验证

本次实际运行：

```bash
pnpm check
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists txt highlights and notes separately through the desktop reader store' --mochaOpts.timeout 120000"
git diff --check
```

结果：

- `PASS`
- `PASS`
- `PASS`
