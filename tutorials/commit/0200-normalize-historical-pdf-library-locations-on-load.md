# 0200: 在加载 library 时归一化历史 PDF 定位，把旧 `epubcfi(...)` 和 `Page 0 / ...` 一次性收掉

这次切片是对前两刀 PDF 语义工作的真正收口。

前面我们已经做了两件事：

1. 新写入的 PDF 状态不再落 `epubcfi(...)`
2. 新生成的 PDF 位置文案变成 `Page x / y`

但库里还有一个现实问题：

- 旧 `library.json` 里已经存在一批历史 PDF 记录
- 它们有的还是 `epubcfi(...)`
- 有的已经是 `Page ...`，但会出现 `Page 0 / ...`

如果不做历史归一化，这个库会长期处于“新数据一种语义，旧数据另一种语义”的状态。

所以这次不再只修新路径，而是把历史记录也一起收掉。

## 这次改了什么

### 1. Rust 后端新增 PDF 定位归一化 helper

文件：`src-tauri/src/util.rs`

新增了两层 helper：

- `normalize_pdf_progress_location(record)`
- `normalize_library_records(records)`

其中 `normalize_pdf_progress_location()` 负责两类情况：

1. 如果是旧的 `epubcfi(...)`
   - 尝试从 `status` 里解析 `Section x / y`
   - 转成 `Page x / y`
   - 转不了就清空

2. 如果已经是 `Page x / y`
   - 再做一次归一化
   - 把 `Page 0 / ...` 这样的页码夹到从 1 开始

也就是说，这个 helper 既处理“旧语义”，也处理“半新但还不够好”的语义。

### 2. `load_library_books` 现在会在返回前顺手做迁移并回写

文件：`src-tauri/src/commands/library.rs`

之前 `load_library_books()` 很简单：

- 读 `library.json`
- 原样返回

现在它会：

1. 读记录
2. 调 `normalize_library_records(&mut records)`
3. 如果有变化，就 `save_library_records()`
4. 再把归一化后的结果返回给前端

这个设计的好处是：

- 不需要额外做一次“手动迁移命令”
- 旧数据会在正常使用时被温和升级
- 迁移成本对用户几乎是零

### 3. `import_readest_library` 也不再把旧 PDF 定位直接带进来

文件：`src-tauri/src/commands/library.rs`

这次顺手把导入路径也接到了同一个 helper：

- `Readest` 导入生成 `LibraryBookRecord` 后
- 如果是 PDF
- 先过一次 `normalize_pdf_progress_location()`

这样“导入旧 PDF”这条路径也不会再往本地库里注入历史格式。

### 4. 前端实时位置格式化继续把 PDF 页码夹到从 1 开始

文件：`src/lib/components/reader/ReaderViewport.svelte`

之前 PDF 已经显示成：

- `Page x / y`

这次再补了一层：

- `current` 至少从 1 开始
- `total` 至少从 1 开始

这样 reader 当前态不会再产出：

- `Page 0 / 294`

### 5. focused PDF restore regression 继续锁住 `Page 0 / ...` 不得出现

文件：`e2e/app.e2e.ts`

这条测试现在除了断言：

- 不是 `epubcfi(...)`
- 是 `Page ...`

还会继续断言：

- 不能是 `Page 0 / ...`

这样就把这次的收口也变成了长期契约。

## 为什么这次修复有效

因为这次 finally 处理了“历史包袱”。

很多项目修语义时只会改：

- 今后的写入路径

但不会处理：

- 过去已经写坏的数据

结果就是：

- 新逻辑没问题
- 但用户一打开旧库，还是到处看到旧格式

这次的关键就是把三层一起收了：

1. **实时 reader 状态**
2. **新写入路径**
3. **旧持久化记录**

只有这样，库里的表现才会真正统一。

## 这次顺手能学到的知识

### 知识点 1：修“语义字段”时，历史数据往往才是大头

代码改起来通常不难。  
难的是你一旦改的是：

- `status`
- `location`
- `progress`
- `kind`

这类语义字段，库里往往已经有一堆旧值。

如果只修新写入，不修历史库：

- QA 会继续看到脏数据
- 用户也会继续看到脏数据
- 然后你以为“怎么明明修了还没干净”

其实是迁移没做完。

### 知识点 2：温和迁移很适合放在“读取时归一化”

不是所有迁移都要单独做一个命令。

像这种：

- 规则简单
- 结果确定
- 成本低

的迁移，很适合放在：

- 读配置时
- 读 JSON 时
- 启动加载时

模式通常就是：

1. load
2. normalize
3. if changed => save back

这样比额外加一套 migration pipeline 更轻。

## 相关文件

- `src-tauri/src/util.rs`
- `src-tauri/src/commands/library.rs`
- `src/lib/components/reader/ReaderViewport.svelte`
- `e2e/app.e2e.ts`

## 本次验证

- `cargo check --manifest-path src-tauri/Cargo.toml` (PASS)
- `pnpm check` (PASS)
- `bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'reopens a library-file pdf with restored progress inside the reader stage' --mochaOpts.timeout 120000"` (PASS)
- `node` 检查本地 `library.json`：`staleCount: 0`，`pageZeroCount: 0`
- `git diff --check` (PASS)
