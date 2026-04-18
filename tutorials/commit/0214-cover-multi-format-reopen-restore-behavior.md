# 0214: 覆盖多格式重开恢复行为

这次提交继续沿着 `P0-1 / Multi-Format Support` 收口，但不再只是证明“能打开”和“能回流到 library”，而是进一步锁住：

- `FB2 / MOBI / AZW3 / CBZ`
- 在 reader 里前进一步
- 返回 library 后写回恢复信号
- 再次通过 library 的 reader href 重开
- reader 真的消费到这份恢复进度

同时这次也顺手修掉了一个真实产品问题：  
`AZW3` 在带 `restoreLocation` 重开时会长时间卡在 `Opening book`，没有抛错，也没有自动回退到 fraction 导航。

## 背景

上一刀已经证明了这几种格式可以：

1. 真实导入到 desktop library
2. 通过 `library-file` 路径打开 reader
3. 返回 library 后进入 `continue reading / recent reading`
4. 在 `library.json` 和 library href 里留下恢复信号

但那一刀仍然只证明了“恢复信号存在”，没有证明“reader 真会使用它”。

对于产品层面的格式对齐，这两者差很多：

- 只写回信号：说明持久化层有数据
- 真正恢复：说明 library -> reader 重开契约已经闭环

这次补的就是后半段。

## 做了什么

### 1. 新增 focused desktop regression，验证多格式重开恢复

在 [`e2e/app.e2e.ts`](/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts) 新增用例：

- `reopens FB2, MOBI, AZW3, and CBZ imports with stored restore progress`

这条回归对四种格式逐个做：

1. 通过真实 `import_library_books` 导入样本
2. 从 library 打开 reader
3. 等待 reader 进入稳定打开态
4. 主动向前翻一步，确保不是留在起始态
5. 返回 library
6. 等待 library href 带出 `fraction` 或 `location`
7. 再次通过这个刷新后的 library href 打开 reader
8. 验证 reader 的当前状态已经不是初始位置，而是消费到了恢复进度

对于断言方式，这次没有强行把所有格式绑成同一条恢复语义，而是按更稳的产品信号判断：

- reflowable 格式优先看 `progressFraction` 或 `cfi`
- fixed/comic 路径允许用 `locationLabel` 的变化来证明重开后不是初始页

### 2. 修复 restoreLocation 卡死不回退的问题

在 [`ReaderViewport.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte) 里，`applyInitialNavigation()` 原来只在 `restoreLocation` 抛错时才回退到 `fraction`：

- `restoreLocation` 成功：直接返回
- `restoreLocation` 抛错：回退 `fraction`
- 但如果 `restoreLocation` 不报错、只是一直不返回，就会把 reader 卡在 `Opening book`

这在 `AZW3` 的真实 `KF8` 样本上被回归打出来了。

现在三条初始导航路径都统一走了超时保护：

- `restoreLocation`
- `restoreFraction`
- `showTextStart`

如果某条导航 5 秒内没有完成，就会按现有的降级语义继续往后走，而不是无限挂住。

### 3. 更新 Feature 审计表

[`FEATURE-PARITY-AUDIT.md`](/Users/dev/workspace2/hc_apps/br1/.planning/FEATURE-PARITY-AUDIT.md) 现在把 `Multi-Format Support` 的证据进一步更新为：

- import
- open
- return
- persist restore signal
- reopen consumes restore progress

也就是说，这几种格式现在不再只是“能展示”，而是已经进入了一条更完整的阅读工作流闭环。

## 为什么这样做

`P0-1` 继续补 opening path 的边际价值已经很低了。  
更值钱的问题是：

- library 写出的恢复参数是不是 reader 真会用
- 多格式重开后是不是还能回到之前读到的位置附近

这是从“格式支持”迈向“产品能力”的关键区别。

## 验证

本次实际运行：

```bash
pnpm check
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'reopens FB2, MOBI, AZW3, and CBZ imports with stored restore progress' --mochaOpts.timeout 120000"
git diff --check
```

## 还没解决

这次仍然没有把 `Multi-Format Support` 改成 `Completed`，因为还差：

- `TXT` 仍然只是 planned-not-implemented
- 多格式 metadata 对齐还没完整收口
- 多格式 annotation/highlight 行为还没对齐
- 还没有 OS 级 `Open With br1` 的完整证据

所以这次是把证据推进到“多格式重开恢复闭环”，不是宣告整个格式主线完结。
