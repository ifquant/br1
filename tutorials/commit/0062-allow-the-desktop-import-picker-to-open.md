# 0062：让桌面端“从本机导入”真的能拉起文件选择器

这次问题不是按钮没绑上，也不是样式遮住了点击，而是更底层的权限问题。

表面现象是：

- 点“从本机导入”
- 什么都没发生

真正原因是：

- `@tauri-apps/plugin-dialog` 已经装了
- 代码也真的在调 `open(...)`
- 但 Tauri capability 里没有给主窗口 `dialog:allow-open`

结果就是运行时会把这次调用拦住。对用户来说，这看起来就像“按钮没反应”。

## 改了什么

- 在 `/Users/dev/workspace2/hc_apps/br1/src-tauri/capabilities/default.json`
  - 补上了 `dialog:allow-open`
- 在 `/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte`
  - 给桌面导入链加了 `try/catch`
  - 如果以后文件选择器再失败，至少会在控制台里看到明确报错，而不是静默失败

## 这次值得学的两个知识点

### 1. Tauri 里“插件已安装”不等于“前端可调用”

这是 Tauri 2 非常容易踩的坑。

你可能已经做了：

- Rust 里 `.plugin(tauri_plugin_dialog::init())`
- 前端里 `import { open } from '@tauri-apps/plugin-dialog'`

但如果 capability 没放行，前端还是不能调用。

也就是说，要让一个桌面能力真的可用，通常要同时满足三层：

1. 依赖安装了
2. Rust 插件初始化了
3. capability 放行了对应权限

少一层都可能表现成“像是代码没执行”。

### 2. 静默失败会把真实根因藏掉

如果一个桌面动作失败时没有报错输出，用户会自然怀疑：

- 按钮没绑
- 事件被遮住
- UI 有 bug

但真实问题可能完全在另一层，比如权限、IPC、能力边界。  
所以像这种“系统对话框 / 文件选择 / 原生 API”路径，最好至少留一层明确日志。

不是为了优雅，是为了下次定位时别浪费半小时。

## 我怎么验证

实际跑过：

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` `PASS`
- capability JSON 读取检查：包含 `dialog:allow-open` `PASS`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` `PASS`

## 还没做什么

- 还没有加用户可见的错误 toast
- 还需要你重启一次 `tauri dev`，让新的 capability 真正生效
