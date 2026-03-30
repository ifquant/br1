# 0090 给 continue reading 增加真实的“打开原文件”动作

这次没有去补假的云按钮，而是补了一个当前系统里真的能工作的动作：

- 打开原文件

它更像 `Readest` 里书项旁边那类“真实可执行”的动作区。

## 这次改了什么

文件：

- `/Users/dev/workspace2/hc_apps/br1/src/lib/services/libraryPersistence.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/services/index.ts`
- `/Users/dev/workspace2/hc_apps/br1/src/routes/library/+page.svelte`
- `/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/ContinueReadingShelf.svelte`

### 1. 增加 `openLibraryBookPath(...)`

在持久化服务层新增：

- `openLibraryBookPath(filePath)`

内部通过：

- `@tauri-apps/plugin-opener`

把文件路径交给系统默认程序打开。

### 2. 把源路径投影到 continue reading 行项

`ShelfBook` 现在增加：

- `sourcePath`

优先取：

- `record.sourcePath`

没有时回退到：

- `record.filePath`

这样 UI 层就能知道“打开原文件”应该指向哪里。

### 3. `ContinueReadingShelf` 增加 `原文件` 动作

在已有的：

- `从头开始`
- `详情`
- `继续`

之外，又补了：

- `原文件`

点它时不会触发行项主导航，而是直接走系统 opener。

### 4. 详情面板也补了源路径

这样即使不点按钮，用户也能在详情里看到：

- 这本书当前指向的真实文件路径

## 这次能学到的 2 个编程点

### 知识点 1：动作最好优先连接真实底层能力

如果当前系统已经能：

- 打开书
- 拿到源路径
- 调系统 opener

那就优先把这类动作接出来。  
这比做一个“看起来像云同步”的假按钮更稳。

### 知识点 2：UI 模型里可以同时保留“阅读链接”和“系统文件动作”

这里一条书不只有：

- `readerHref`

还同时有：

- `sourcePath`

这代表同一条业务记录，往往可以支撑多种动作：

- 在 app 内继续阅读
- 在系统里打开原文件

把这些动作显式拆开，后面扩展会更清晰。

## 这次还没做什么

- 还没有“在 Finder 中显示”这种更细的系统动作
- 也还没有真正的云上传/下载动作

这次先把最真实、最能工作的动作补进来。
