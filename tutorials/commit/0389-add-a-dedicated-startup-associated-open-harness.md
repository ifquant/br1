# 0389 - 给 startup associated-open 固定一条 focused reproducer

## 背景

`br1` 目前的标准桌面 full suite 已经稳定在：

- `38 passing / 1 skipped`

剩下唯一被跳过的，是 startup associated-file 这条冷启动用例。前一条文档提交已经把边界写清楚了：

- dedicated startup case 本身能过
- 但不能为了让它混进标准 full，而去放宽全局 startup queue owner

这意味着下一步最合理的工程动作，不是继续碰 app 启动逻辑，而是先把这条 dedicated 调查路径收成仓库内的正式入口。

## 主要目标

这次提交只做一件事：

- 给 startup associated-open 提供一条专用的 WebDriver reproducer 命令

这样后续调查可以直接跑这条用例，而不需要每次都手写环境变量和 `grep` 命令，也不会污染标准 `test:e2e:tauri`。

## 改动概览

- 新增 [`scripts/automation/test-tauri-webdriver-startup-associated-open.sh`](/Users/dev/workspace2/hc_apps/br1/scripts/automation/test-tauri-webdriver-startup-associated-open.sh)
- 新增 `package.json` 脚本：
  - `pnpm test:e2e:tauri:startup-associated-open`
- 脚本默认把 `static/samples/sample-book.fb2` 同时注入：
  - `APP_OPEN_ARGS`
  - `BR1_TEST_ASSOCIATED_FILE_PATH`
- 然后只运行这条 focused case：
  - `opens a startup associated book argument in a separate reader window`

这次最重要的变化不是“把它跑绿”，而是把这条未收口路径固定成仓库内可复现的入口。

## 关键知识

### 1. 把不稳定的验证入口收成 focused reproducer，比继续污染主 harness 更值

工程里常见的坏习惯，是把“一个特殊 case 也要验证”直接塞进主 test command。  
如果这个 case 会改变 app 的启动形态，它就不再是普通附加项，而是另外一种运行模式。此时更安全的做法，是给它单独入口。

单独入口的价值有两个：

- 它让验证方式可重复、可发现，不用靠聊天记录抄命令
- 它把特殊启动模式和主回归面隔离开，不会顺手把稳定 suite 一起拖坏

即便这条入口当前仍然会失败，它也比“只有聊天里记着一条临时命令”强得多，因为失败可以被稳定复现、比较和继续调查。

### 2. 环境变量是 harness 的边界，不是产品逻辑的边界

这里用 `APP_OPEN_ARGS` 和 `BR1_TEST_ASSOCIATED_FILE_PATH` 驱动 startup case，目的是让测试 harness 在“像真实冷启动那样传参数”的前提下运行。  
它们属于测试入口的控制面，不应该被误解成产品内部 API。

这类变量适合被封装进脚本，而不适合每次手敲散落在命令行里。

## 验证

- `bash scripts/automation/test-tauri-webdriver-startup-associated-open.sh`（FAIL，复现 startup state 只有 `main -> /library`、reader window 未打开）
- `pnpm check`（PASS）
- `git diff --check`（待本提交执行）

## 未覆盖项

- 这次没有让 startup associated-open 重新并入标准 `test:e2e:tauri`
- 这次没有解决 dedicated startup 时首个 library window 为什么不是 `main`
- 这次只是把 focused reproducer 固定下来，不代表 startup queue ownership 已经找到最终方案
