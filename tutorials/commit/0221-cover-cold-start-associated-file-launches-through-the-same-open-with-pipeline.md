# 0221: 用同一条 open-with 管线覆盖冷启动文件关联

这一步继续沿着 `P0-1` 的 `File Association and Open With` 主线推进，但还是保持单一目标：

- 不去做 packaged installer
- 不去补更多 reader 能力
- 只把上一刀已经打通的“运行中 open-with 热路径”，继续扩成“冷启动带文件参数”也走同一条产品链路

## 为什么这一步值得单独做

上一刀已经证明：

- bundle 声明了文件关联
- 运行中的 `main` 窗口能接住关联打开请求
- 请求会被转换成结构化 `library-file` target
- 然后拉起新的 reader window

但那还只是半条证据。

真实的桌面文件关联至少有两种常见场景：

1. **应用已经在运行**
   - 系统把“打开这个文件”的请求丢给现有实例
2. **应用还没运行**
   - 系统直接带着文件路径启动应用

如果第二条没有证据，`File Association and Open With` 还是不能算真正闭环。

## 这一步没有再改产品主线，而是把同一条管线补成双入口

前一刀其实已经在后端埋好了基础：

- `single-instance` 回调会把二次打开请求塞进 pending queue
- `.setup(...)` 里也会读取启动参数，并把文件路径塞进同一个 pending queue

也就是说，产品代码层面其实已经是：

- **startup**
- **runtime second-instance**

共用同一条请求队列。

所以这一步最值钱的不是再改业务逻辑，而是：

- 把测试基座补成能带应用启动参数
- 然后证明冷启动确实会消费这条同一套 queue path

## 改了什么

### 1. webdriver 启动脚本现在能把文件路径透传给 Tauri app

文件：

- `/Users/dev/workspace2/hc_apps/br1/scripts/automation/test-tauri-webdriver.sh`

新增：

- `APP_OPEN_ARGS`

脚本现在会在启动 `tauri dev` 时，按下面这种方式透传参数：

- `tauri dev ... -- <app args>`

这一步的价值是：

- 不用为冷启动测试做一套单独的 app 启动器
- 也不用在产品代码里塞测试专用入口
- 直接复用真实的 Tauri 启动参数语义

## 2. focused regression 明确验证冷启动带文件路径时会自动拉起 reader window

文件：

- `/Users/dev/workspace2/hc_apps/br1/e2e/app.e2e.ts`

新增测试：

- `opens a startup associated book argument in a separate reader window`

它的行为很直接：

1. 通过环境变量给测试进程一个目标路径
2. 启动 app 时把这个路径作为 Tauri app 参数带进去
3. 测试启动后等待第二个窗口出现
4. 进入新开的 reader window
5. 断言：
   - 打开的是 `FB2` 样本
   - `title` 可读
   - `formatLabel === FB2`
   - URL 仍然是结构化的 `library-file` reader target

这里故意继续用 `FB2` 样本，是因为它现在已经有稳定的：

- title
- author
- language
- 打开回归

适合拿来做 `open-with` 主线的基准证据。

## 为什么这条测试很关键

它证明的不是“我们能手动模拟一个冷启动事件”，而是：

- app 启动参数
- Tauri setup 阶段
- pending queue
- main window 消费
- structured `library-file` target
- separate reader window

这一整条链路在冷启动情况下确实能连通。

也就是说，现在 `File Association and Open With` 已经有两类 focused 证据：

1. **running-instance open-with**
2. **startup associated-file launch**

这比之前“只有 bundle 声明 + 热路径”更接近真正的产品闭环。

## 总账怎么更新

`FEATURE-PARITY-AUDIT.md` 里，这条能力现在可以更准确地写成：

- 已有文件关联声明
- 已覆盖运行中打开
- 已覆盖冷启动带文件路径打开

剩下的主 gap 也更清楚了：

- 不是产品逻辑本身缺口
- 而是 **packaged installer 级别的 OS 注册与 release-build 证据**

这类事情再往下做，就已经不属于“继续在 dev 环境里补逻辑”了。

## 这一步没有做什么

这次没有做：

- macOS `.app` / `.dmg` 的真实系统文件关联验证
- Windows 安装器 / Linux desktop entry 的真实注册验证
- 更多格式新能力
- library/reader 的其它体验改造

这一步只完成了一件事情：

- 把 `open-with` 这条线从“运行中的热路径可用”推进到“冷启动和运行中都已被同一条产品管线覆盖”
