# 0082 把阅读恢复从 fraction 升级成 location(CFI) 优先

这次提交是在上一刀“恢复到上次百分比”的基础上，再往 `Readest` 靠一步。

`fraction` 的好处是简单，但它不够准：

- 字号变了，位置会漂
- 页数变了，位置会漂
- 同一章中间的具体位置也不够准

`Readest` 更接近的做法是：

- 保存 `location`
- 也就是更精确的 CFI / locator 字符串
- 重新打开时优先用 `view.init({ lastLocation })` 恢复

这次 `br1` 先补了这条最小链。

## 这次改了什么

### 1. 书库记录增加 `progressLocation`

文件：

- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts`

现在书库记录除了：

- `progressFraction`

还会存：

- `progressLocation`

它代表更精确的阅读位置字符串。

### 2. Reader 事件里把 `lastLocation.cfi` 提出来

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/reader/foliate.ts`

`foliate-view` 的 `lastLocation` 本身已经会带 `cfi`。  
这次只是把它显式补进 `br1` 的类型和 `readerstate` 事件里：

- `progressLocation`

这样 route 层和持久化层就能拿到它。

### 3. 回写书库时一起保存 `progressLocation`

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs`

`update_library_reading_state(...)` 现在不只写：

- 标题
- 作者
- 章节
- 百分比

还会把：

- `progressLocation`

一起存进 `library.json`。

### 4. 重新打开书时，优先用 `lastLocation` 恢复

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderViewport.svelte`

现在 `library-file` 打开链会带两种恢复信息：

- `restoreLocation`
- `restoreFraction`

恢复时的优先级是：

1. 先 `init({ lastLocation: location })`
2. 没有 location 时再 `goToFraction(fraction)`
3. 都没有时才回到 0

这样做的原因是，`Readest` 自己也是先把上次的精确位置交给 viewer 初始化，再让 viewer 内部完成定位恢复。  
这比直接 `goTo(location)` 更接近它的真实打开顺序。

### 5. 从 `Readest` 导入时也尽量带上 location

文件：

- `/Users/dev/workspace2/hc_apps/br1/src-tauri/src/lib.rs`

这次顺手补了一步：

- 读取 `Readest/Books/<hash>/config.json`
- 如果里面有 `location`
- 就一起导入到 `br1` 的书库记录里

这样从 `Readest` 迁过来的书，不只是迁书本身，也开始迁阅读位置。

## 这次能学到的 2 个编程点

### 知识点 1：恢复状态通常应该有主键和兜底键

只靠一个字段做恢复，通常不够稳。

这次的策略就是：

- 主恢复键：`location`
- 兜底恢复键：`fraction`

这是一种很常见的工程手法：

- 先用更精确的结构化定位
- 如果没有，再退回粗一点的定位

### 知识点 2：类型定义要跟着事件事实走

`foliate-view` 实际上已经会产出 `lastLocation.cfi`，  
但如果本地类型没写出来，应用层就会把这个事实“看不见”。

所以这次也说明了一个很常见的问题：

- 库已经有能力
- 但你的类型层没有表达它
- 最终上层功能就补不出来

很多时候修功能，不只是改逻辑，还要把“真实存在的数据”补进类型系统。

## 这次还没做什么

- 还没有处理格式差异更大的恢复策略，比如 PDF 专用位置恢复
- 还没有给搜索/标注等功能复用这份 `progressLocation`

这次只先完成最小但已经更像 `Readest` 的一步：

`保存并恢复更精确的阅读位置字符串`
