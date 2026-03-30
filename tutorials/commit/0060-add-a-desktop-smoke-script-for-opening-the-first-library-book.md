# 0060: 给桌面自动化加一条“点开第一本书”的 smoke 脚本

这次的目标不是做一个完美的桌面自动化框架，而是先把第一条稳定脚本立起来。

你现在想调通的是桌面自动化流程。最开始最容易掉进一个坑：

- 每次都临时拼 `osascript`
- 再手敲 `cliclick`
- 再肉眼判断到底有没有点中

这样很快就会变成“这次到底是 app 坏了，还是脚本坏了，还是权限坏了”，根本没法复用。

所以这一步的目标很简单：

- 把桌面自动化最小成功路径写成一个脚本
- 让它至少能前置 `br1`
- 取到 library 主窗口 bounds
- 按相对坐标点击第一本书
- 用“窗口数是否增加”判断 reader window 有没有弹出来

## 这次做了什么

新增脚本：

- [desktop-open-first-library-book.sh](/Users/dev/workspace2/hc_apps/br1/scripts/automation/desktop-open-first-library-book.sh)

它会做这几步：

1. 检查依赖
   - `osascript`
   - `cliclick`

2. 把 `br1` 进程置前

3. 通过 `System Events` 找到名字是 `br1` 的主窗口

4. 读取它的：
   - `position`
   - `size`

5. 用相对窗体坐标点击第一张书卡的大致中心

6. 比较点击前后的窗口数量
   - 增加了，就视为 reader window 打开成功
   - 没增加，就报 `FAIL`

## 为什么不用绝对屏幕坐标

因为绝对坐标太脆了。

只要下面任何一个东西变了，绝对坐标就会失效：

- 窗口位置
- 显示器分辨率
- dock/菜单栏占位
- 你是不是先拖过窗口

相对窗体坐标虽然还不够“智能”，但已经比“永远点屏幕某个固定位置”稳很多。

## 这次对应的知识点

### 1. macOS 桌面自动化经常是“两层工具”组合

这里用了两层：

- `osascript`
  - 负责问系统“窗口在哪、前台是谁、窗口数是多少”
- `cliclick`
  - 负责真正发鼠标动作

这两者各有长处：

- `osascript` 适合拿结构化 UI 信息
- `cliclick` 适合做简单可靠的坐标点击

桌面自动化经常不是一个工具包打天下，而是“状态查询”和“动作执行”分开。

### 2. smoke script 的目标不是聪明，而是可重复

刚开始做自动化时，很多人会忍不住想一口气做：

- 自动识别元素
- 自动截图
- 自动判断内容
- 自动恢复环境

但最先应该站住的是：

- 能不能重复执行
- 失败时是不是能明确报 `FAIL`

所以这条脚本故意只验证一件事：

- 点击第一本书后，reader window 有没有多出来一个

先把最小闭环打通，再往上叠智能度。

## 验证

- `bash /Users/dev/workspace2/hc_apps/br1/scripts/automation/desktop-open-first-library-book.sh`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## 这次没包含什么

- 还没有自动判断新开的 reader window 里正文是否成功加载
- 还没有处理多显示器、不同窗口尺寸、不同书架密度下的点击偏移自适应
- 这条脚本默认 `br1` 已经在运行，并且主 library 窗口存在
