# 0062：给 br1 补第一条 Readest 风格的 WDIO 桌面用例

这次提交不是继续强化 `cliclick`，而是把 `br1` 再往 `Readest` 的正式桌面自动化方式靠了一步：在已经打通的 `Tauri WebDriver` 通道上，补一条真正的 `wdio` 桌面 smoke test。

## 这次改了什么

- 给仓库增加了 `wdio` 相关 devDependencies。
- 新增 [wdio.conf.ts](/Users/dev/workspace2/hc_apps/br1/wdio.conf.ts)，让 `wdio` 直连 `127.0.0.1:4445` 这个 Tauri WebDriver 端口。
- 新增 [e2e/app.e2e.ts](/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts)，先验证最小桌面基线：
  - 应用默认落在 library
  - library 主容器存在
  - 搜索框存在
  - import tile 存在
  - 可以在桌面 WebView 里执行一段最小 JavaScript
- 增强 [test-tauri-webdriver.sh](/Users/dev/workspace2/hc_apps/br1/scripts/automation/test-tauri-webdriver.sh)，让它在 WebDriver 就绪后能接着执行一条测试命令，而不只是做端口 smoke。
- 在 [package.json](/Users/dev/workspace2/hc_apps/br1/package.json) 里增加 `test:e2e:tauri`，把“启动 Tauri WebDriver + 跑 WDIO”收成一个命令。

## 为什么这样做

`Readest` 的正式桌面自动化不是靠坐标点击脚本，而是 `wdio + Tauri WebDriver`。如果 `br1` 也想沿着这条线走，第一步不是一上来写复杂用例，而是先确认：

1. `wdio` 能连上桌面窗体
2. 能找到 library 里的关键元素
3. 能在真实桌面 WebView 环境里执行断言

这一步通了，后面才能继续加“点书打开 reader”“新窗出现”“reader chrome 存在”这类更像产品流的测试。

## 这次能学到的具体知识

### 1. `wdio` 在这里不是“开浏览器”，而是连 Tauri 内嵌的 WebDriver 服务器

在这套模式下：

- `browserName: 'chrome'` 不是说它会启动一份普通 Chrome
- 它真正连接的是 `tauri-plugin-webdriver` 暴露出来的 W3C WebDriver 端口
- 所以 `hostname` 和 `port` 才是关键配置

这和 Playwright 的 `page.goto(...)` 思维不太一样。这里更像“远程控制一个已经运行起来的桌面 WebView”。

### 2. 桌面 smoke test 一开始应该先测“存在性”和“连通性”

第一条桌面用例别一上来就写复杂交互。更稳的顺序是：

1. 页面是否真的起来了
2. 关键容器是否存在
3. 关键控件是否存在
4. JavaScript 是否能在应用上下文里执行

只要这四层先通，后面加点击、窗口切换、reader 打开之类的测试，定位问题会容易很多。

## 验证

这次提交完成后，会实际运行：

- `pnpm check`
- `pnpm test:e2e:tauri`
- `git diff --check`

## 还没包括

- 还没有测“点击一本书后新 reader window 打开”
- 还没有测 reader 里的真实内容加载
- 还没有把 Playwright 和 WDIO 两条自动化线统一成一个入口
