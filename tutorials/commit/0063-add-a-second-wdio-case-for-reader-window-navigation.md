# 0063：给 WDIO 桌面基线补一条“点书打开 reader 新窗”用例

这次不是加更多工具，而是在已经能跑的 `wdio + Tauri WebDriver` 基线上，补第二条更接近 `Readest` 真实桌面流的用例：从 `library` 点第一本书，确认会弹出新的 `reader window`。

## 这次改了什么

- 扩展 [app.e2e.ts](/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts)
- 新增一条桌面断言：
  - 找到第一本可打开的书
  - 点击它
  - 等待窗口数增加
  - 切换到新窗口
  - 断言 `reader shell / reader window chrome / reader stage` 都存在

## 为什么这样做

上一条 WDIO 用例只证明了两件事：

1. `wdio` 能连上桌面窗体
2. `library` 页面能正常加载

但 `Readest` 的关键桌面动作，不是“library 能打开”，而是“library 驱动 reader 新窗口”。所以第二条最值得补的，不是更复杂的搜索或导入，而是把这条窗口级导航先测住。

## 这次能学到的具体知识

### 1. 桌面 WebDriver 测试里，窗口切换通常要靠 handle 集合增量判断

这里不是浏览器里 `window.open()` 的普通页面测试，而是 Tauri 新建 `WebviewWindow`。更稳的判断方式是：

1. 先记住旧的 `window handles`
2. 触发动作
3. 等 `handles.length` 变大
4. 用“新 handle = 新集合减旧集合”找出刚打开的窗口

这样比写死窗口名更稳。

### 2. 新窗 smoke test 应该优先断言“结构存在”，不要一上来就测内容渲染

第二条用例先断言：

- `.reader-shell`
- `reader window chrome`
- `reader stage`

这样做的好处是，一旦 reader 里内容加载还有别的问题，你也能先把“新窗真的打开了、路由真的切过去了、reader 框架真的出现了”这条链测住。

## 验证

这次提交完成后，会实际运行：

- `pnpm check`
- `pnpm test:e2e:tauri`
- `git diff --check`

## 还没包括

- 还没有断言 reader 里的正文内容真的加载成功
- 还没有验证点击书后新窗 URL 的具体查询参数
- 还没有覆盖“导入一本本地书后再打开 reader”的桌面路径
