# BR1 阅读器重写教程式计划

## 背景
- `apps/br1` 是 `apps/readest-app` 的 Svelte 重写版本。
- 采用逐步、增量式重写。
- 重写过程中尽量补充注释。
- 作为新手，通过重写过程持续学习 Svelte 知识。

## 已参考来源
- 入口与页面：`apps/readest-app/src/app/layout.tsx`、`apps/readest-app/src/app/library/page.tsx`、`apps/readest-app/src/app/reader/page.tsx`。
- 阅读器核心：`apps/readest-app/src/app/reader/components/Reader.tsx`、`apps/readest-app/src/app/reader/components/ReaderContent.tsx`、`apps/readest-app/src/app/reader/components/FoliateViewer.tsx`。
- 文档：`docs/SvelteMigration.cn.md`、`docs/apps/Reader.cn.md`、`docs/apps/ReaderLogic.cn.md`、`docs/foliate-js.cn.md`、`docs/features/foliate-integration.md`。

## 差距分析（apps/br1 vs apps/readest-app）
- 项目结构：`apps/br1` 仅有基础 `+layout`/`+page` 与静态样式，缺少真实路由与模块划分。
- 依赖与工具链：缺少 `foliate-js`、Tailwind/daisyui、图标库、i18n、测试与构建脚本等关键依赖配置。
- 样式与资源：未迁移 `globals.css`、主题系统、字体与纹理资源、公共静态资源。
- 状态管理：尚未建立等价于 Zustand 的 Svelte stores，缺少设置、阅读器、书库、主题等核心状态。
- 核心库与工具：`libs`/`utils`/`types` 还未导入，读取与解析书籍链路不存在。
- 阅读器核心：`FoliateView` 封装、事件桥接、内容变换、进度同步等尚未实现。
- 书库与导入：书库列表、导入流程、上传下载队列、元数据编辑等缺失。
- 服务层与平台适配：`AppService`、`Environment`、Tauri/平台 API 封装未建立。
- 国际化与文案：未接入 i18n 资源与多语言切换。
- 测试与校验：缺少单测、端到端校验及性能检查脚本。

## 差距 -> 可执行任务（按文件/模块）
- `apps/br1/package.json`：补齐依赖（`foliate-js`、Tailwind/daisyui、i18n、图标库等）与脚本（构建、检查、测试）。
- `apps/br1/svelte.config.js`、`apps/br1/vite.config.js`：配置路径别名、静态资源与必要插件。
- `apps/br1/src/app.html`：对齐 meta/manifest/图标设置与主站标题/描述。
- `apps/br1/src/routes/+layout.svelte`：迁移全局样式入口与主题初始化逻辑，挂载全局 Providers（后续实现）。
- `apps/br1/src/routes/+page.svelte`：替换为真实入口路由（Library 或 Reader），移除占位 UI。
- `apps/br1/src/lib/styles/globals.css`（新增）：迁移 `apps/readest-app/src/styles/globals.css`。
- `apps/br1/static/`：补齐 `apps/readest-app/public` 的核心资源（图标、manifest、纹理图）。
- `apps/br1/src/lib/types/*`（新增）：迁移 `apps/readest-app/src/types/*.ts`。
- `apps/br1/src/lib/utils/*`（新增）：迁移 `apps/readest-app/src/utils/*.ts`，补浏览器环境判断。
- `apps/br1/src/lib/libs/document.ts`（新增）：迁移 `apps/readest-app/src/libs/document.ts`。
- `apps/br1/src/lib/services/appService.ts`、`apps/br1/src/lib/services/environment.ts`（新增）：建立平台服务适配层。
- `apps/br1/src/lib/stores/settings.ts`（新增）：迁移 `settingsStore` 的结构与持久化。
- `apps/br1/src/lib/stores/reader.ts`（新增）：迁移 `readerStore`，拆分视图状态与持久设置。
- `apps/br1/src/lib/stores/library.ts`（新增）：迁移 `libraryStore` 的数据结构与同步入口。
- `apps/br1/src/lib/reader/FoliateView.svelte`（新增）：实现 foliate view 封装与事件桥接。
- `apps/br1/src/routes/reader/+page.svelte`（新增）：实现最小阅读器页面与路由。
- `apps/br1/src/routes/library/+page.svelte`（新增）：实现书库列表与导入入口。
- `apps/br1/src/lib/components/`（新增）：迁移基础组件（Dialog、Toast、Modal、Button 等）。
- `apps/br1/src/lib/i18n/`（新增）：接入 i18n（配置 + `docs` 的 locale 资源）。
- `apps/br1/src-tauri/`：对齐 Tauri 配置与权限（按实际需要逐步补齐）。

## 重写目标（MVP）
- 用 `foliate-js` 打开并渲染书籍。
- 具备阅读进度保存、基础设置与库内导航。
- 提供基础阅读器 UI（页眉/页脚、侧栏开关、设置弹窗）。
- 核心流程适配 Tauri 环境。

## 教程式路线（从入门到完整复刻）
说明：课程按“低台阶递进”设计，每课都补更细的子任务清单，保证可以一步一步完成并形成教程资源。

### 阶段 A：基础入门与工程准备（第 1-8 课）
#### 第 1 课：目标拆解与里程碑（先梳理阅读器模块）
- 覆盖模块：
  - 本地文档：`docs/apps/Reader.cn.md`、`docs/apps/ReaderLogic.cn.md`、`docs/apps/ReaderComponents.cn.md`、`docs/apps/ReaderSubmodules.cn.md`、`docs/pages/ReaderDeepDive.md`。
  - 在线文档：`https://deepwiki.com/readest/readest/4-reader-interface`、`/4.1-reader-page-and-orchestration`、`/4.4-sidebar-and-navigation`、`/4.5-notebook-interface`、`/5.1-annotation-system`。
- 阅读器主要模块清单（来自 docs + deepwiki）：
  1. Reader Page 与全局控制（`src/app/reader/page.tsx`、`Reader.tsx`）：初始化、系统 UI、全局弹窗与快捷键。
  2. ReaderContent 与 BooksGrid（`ReaderContent.tsx`、`BooksGrid.tsx`）：多书会话、布局与关闭流程。
  3. FoliateViewer 与 `<foliate-view>`（`FoliateViewer.tsx`、`foliate-js/view.js`）：引擎接入、事件桥接、样式注入。
  4. Sidebar 与导航（`sidebar/*`）：TOC、搜索、书摘/聊天记录切换。
  5. Notebook（`notebook/*`）：笔记面板与编辑器。
  6. Annotator（`annotator/*`）：选区、高亮、弹层与导出。
  7. TTS（`tts/*`）：朗读控制、进度与样式高亮。
  8. Header/Footer/ViewMenu（`HeaderBar.tsx`、`footerbar/*`、`ViewMenu.tsx`）：阅读控制与设置入口。
  9. 翻译与校对（`useTextTranslation.ts`、`ProofreadRules.tsx`、`transformers/*`）：并排翻译与文本处理。
  10. 进度同步与 KOSync（`useProgressSync.ts`、`useKOSync.ts`）：阅读进度同步与冲突处理。
  11. Iframe 事件与手势（`useIframeEvents.ts`、`iframeEventHandlers.ts`、`usePagination.ts`）：点击/滑动/键盘交互。
  12. 主题/字体/纹理（`styles/*`、`utils/style.ts`）：主题与排版系统。
  13. Reader 相关 Store（`readerStore.ts`、`bookDataStore.ts`、`sidebarStore.ts` 等）：状态与持久化。
- 子任务清单（更可执行）：
  - 子任务 1：了解每个主要模块的功能与接口
    1. 按上面模块逐一打开对应文件与文档，记录“输入/输出/依赖 Store/事件”。
    2. 给每个模块写 3~5 行说明：职责、关键接口（Props/事件）、依赖的 Store/Service。
    3. 汇总成 `apps/br1/plan.md` 的“模块卡片清单”。
    验收问题（按模块，需从源码中回答，问题数量按复杂度调整）：
    - Reader Page 与全局控制（`src/app/reader/page.tsx`、`Reader.tsx`）：
      - `page.tsx` 中在哪个 `useEffect` 触发更新检查？依赖了哪些 settings 字段？
      - `Reader.tsx` 中如何处理 Android 返回键？事件监听与关闭逻辑在哪里？
      - Reader 挂载了哪些全局弹窗组件？它们在层级中放在哪里？
      - 系统 UI 显示/隐藏与亮度调整在哪些 effect 中处理？
      - Reader 首屏渲染的条件是什么？哪些状态不满足会显示空白占位？
      - `mountAdditionalFonts` 与 `interceptWindowOpen` 在何处调用？目的是什么？
      - 代码中哪些 store 被 Reader 依赖？每个 store 在 Reader 中承担什么职责？
    - ReaderContent 与 BooksGrid（`ReaderContent.tsx`、`BooksGrid.tsx`）：
      - `ReaderContent` 如何从 URL 解析 `bookIds`？使用了哪个分隔常量？
      - `initViewState` 在哪里调用？如何区分主视图与并行视图？
      - `handleCloseBooks` 与 `saveConfigAndCloseBook` 的调用链是什么？
      - `BooksGrid` 如何根据 `bookKeys` 计算布局？哪些 props 传给 `FoliateViewer`？
      - `beforeunload`、`close-reader` 等事件在何处注册/解绑？各自触发了什么流程？
      - `lastOpenBooks` 的保存逻辑在哪里？何时写入 settings？
      - 关闭最后一本书时有哪些分支（Tauri 窗口/浏览器返回）？
    - FoliateViewer 与 `<foliate-view>`（`FoliateViewer.tsx`）：
      - 动态 import `foliate-js/view.js` 的位置在哪？创建 `<foliate-view>` 的流程是怎样的？
      - `book.transformTarget` 监听了哪些事件？`data` 事件如何接入 `transformContent`？
      - renderer 的属性（flow/gap/size/zoom/spread）在哪里设置？各值来自哪些 `viewSettings`？
      - `evalInlineScripts` 在何种条件下触发？对应的安全开关是什么？
      - 进度更新事件如何写入 store？相关事件名是什么？
      - `applyMarginAndGap` 如何计算边距？哪些设置会影响 top/bottom/left/right？
      - 竖排/RTL 的判断流程是什么？在哪一步写回 `viewSettings`？
      - 自定义字体加载与注入在哪些 effect 中执行？对 iframe 文档如何处理？
      - 预分页（pre-paginated）布局下的 `spread`/`scale-factor` 在哪里设置？
      - 书内已存在的批注如何在加载时重新绘制？相关数据来自哪里？
    - Sidebar 与导航（`sidebar/*`）：
      - 侧栏显示/固定状态由哪个 store 控制？对应字段是什么？
      - TOC/搜索/书摘等内容模式如何切换？对应的组件与条件是什么？
      - 侧栏拖拽调整尺寸的逻辑在哪个文件？使用了哪些事件？
      - 搜索结果模式与目录模式在渲染策略上有何差异？
      - 侧栏的“浮动/固定”两种模式具体如何影响布局（容器类名/样式）？
      - TOC 的自动滚动与用户交互冲突如何处理（冷却时间等）？
    - Notebook（`notebook/*`）：
      - 笔记数据从哪个 store 读取？数据结构是怎样的？
      - Notebook 的编辑器组件在哪？保存流程触发了哪些方法？
      - Notebook 的筛选/搜索/分组逻辑存在于哪些组件？
    - Annotator（`annotator/*`）：
      - 文本选择检测由哪个 hook/action 完成？选区数据结构是什么？
      - 创建批注时调用了 `foliate-view` 的哪个方法？保存到哪里？
      - `draw-annotation` 事件如何驱动高亮绘制？
      - 弹层定位的计算逻辑在哪个文件？如何避免超出视口？
      - 快捷菜单的触发条件与隐藏逻辑是什么？
      - 批注样式（highlight/underline）与颜色从哪里读取？
      - 批注删除/更新的入口函数与状态更新路径是什么？
      - 选区转换为 CFI 的逻辑在哪个工具或服务中完成？
    - TTS（`tts/*`、`services/tts/*`）：
      - UI 层如何与 `TTSController` 绑定？状态来自哪个 store？
      - `MediaSession` 的设置逻辑在哪个文件？更新了哪些元信息？
      - `unblockAudio` 的触发时机与目的是什么？
      - 高亮样式在哪个组件/设置项中配置并应用？
      - TTS 播放/暂停/停止的事件从哪里发出？如何在 UI 中体现？
      - 朗读进度与当前句子的定位如何获取？
    - Header/Footer/ViewMenu（`HeaderBar.tsx`、`footerbar/*`、`ViewMenu.tsx`）：
      - 顶部栏按钮如何切换 Sidebar/Settings/Notebook？对应的 store 方法是什么？
      - `HeaderBar` 在不同平台（Windows/macOS）下有哪些布局差异？
      - 底部进度条拖动时如何调用 `view.goToFraction`？是否有防抖逻辑？
      - ViewMenu 修改哪些阅读设置？这些设置在哪个 store 持久化？
      - Header 的显示/隐藏触发条件是什么？是否与 hover/点击相关？
      - FooterBar 的移动端/桌面端组件如何分支？
    - 翻译与校对（`useTextTranslation.ts`、`ProofreadRules.tsx`、`transformers/*`）：
      - 翻译功能如何监听可视区域文本？`IntersectionObserver` 在哪初始化与销毁？
      - 翻译结果是如何插入 DOM 的？插入节点的结构是什么？
      - 校对规则在哪个 transformer 中执行？UI 如何切换开关？
      - 翻译/校对开关对渲染管线的影响路径是什么？
      - 翻译结果的缓存策略在哪里处理？是否有节流或去重？
    - 进度同步与 KOSync（`useProgressSync.ts`、`useKOSync.ts`）：
      - 进度同步由哪个事件触发？进度数据写入到哪里？
      - `useKOSync` 的状态机有哪些状态？冲突时使用哪个组件处理？
      - EPUB 与 PDF 的定位格式差异在哪体现？
      - 何时触发 `flush-kosync` 或进度上传？
      - KOSync 的策略（send/receive/prompt）从哪个 settings 字段读取？
      - CFI <-> XPointer 转换函数在哪里？调用链是怎样的？
    - Iframe 事件与手势（`useIframeEvents.ts`、`iframeEventHandlers.ts`、`usePagination.ts`）：
      - Iframe 内部绑定了哪些事件？如何转发到主线程？
      - 翻页逻辑如何区分点击/滚轮/触摸？
      - 双击/手势禁用开关来源于哪里？如何影响事件处理？
      - 键盘快捷键如何映射到 Reader 行为？
      - `postMessage`/`eventDispatcher` 的使用路径是什么？如何避免重复监听？
    - 主题/字体/纹理（`styles/*`、`utils/style.ts`、`useBackgroundTexture.ts`）：
      - `getStyles` 生成的 CSS 在哪里注入到 `foliate-view`？
      - 自定义字体如何加载并注入 iframe？关键函数是什么？
      - 背景纹理的选择与应用逻辑在哪些文件？
      - 主题的颜色覆盖（override-color）在何处生效？如何注入到内容中？
    - Reader 相关 Store（`readerStore.ts`、`bookDataStore.ts`、`sidebarStore.ts` 等）：
      - `readerStore` 的 `viewStates` 结构是什么？如何创建/销毁？
      - `readerStore` 在何处触发保存进度？与 `bookDataStore` 的关系是什么？
      - `bookDataStore` 的 `config.booknotes` 如何读写与持久化？
      - 哪些 store 字段会影响阅读器 UI 的显示与交互？
      - `viewSettings` 的默认值来自哪里？如何合并用户设置？
      - 哪些 store 更新会导致渲染器属性重新计算？
  - 子任务 2：拆分 MVP 与完全功能对齐列表
    1. 对每个模块写 MVP 必须项与可延后项。
    2. 形成“模块 -> MVP/Full”对照表（可放在 `apps/br1/plan.md` 或单独文档）。
    3. 标记依赖关系：哪些模块必须先完成。
    验收问题（需结合源码回答）：
    - 每个模块的 MVP 是否能指向至少一个具体文件/组件/Hook？能否写出对应路径与关键函数/组件名？
    - 每个模块的 Full 功能是否能指向“额外的实现文件”？能否说明这些文件为何不属于 MVP（以代码职责为依据）？
    - Reader MVP 是否满足“打开书籍 -> 翻页 -> 保存进度 -> 再次打开恢复”的最小闭环？对应的代码位置分别在哪里？
    - MVP 中必须保留的 Store/Service 是哪些？它们在代码中依赖了哪些其他模块？
    - 哪些功能明确属于 Full：TTS、翻译、校对、KOSync、AI、支付等？能否指明其入口文件/Hook？
    - 是否识别出平台专属功能（Tauri/移动端）并在 MVP 中标记“可延后”？对应代码路径是什么？
    - 对照表是否标注了“不可拆分的依赖链”？例如 FoliateViewer 依赖哪些 store 与 utils？
    - 是否指出哪些模块在没有某个依赖时会失效，并给出代码依据（如调用链或 import）？
    - 是否列出外部依赖模块（`foliate-js`、`simplecc-wasm`、PDF.js 资源）并说明其在 MVP 或 Full 中的必要性？
    - 如果把某个模块延后，会影响哪些可见功能？能否给出最直接的 UI/功能缺失点？
  - 子任务 3：拆成里程碑与可验收
    1. 按模块依赖拆出 3~5 个里程碑（如：渲染引擎、阅读 UI、书库导入、同步/高级功能）。
    2. 为每个里程碑写 3 条可验收标准（可运行的功能点）。
    3. 明确每个里程碑的验证方式（手动用例或脚本）。
    验收问题（需结合源码回答）：
    - 每个里程碑是否明确绑定到具体代码目录/文件？能否列出“本里程碑需要完成的关键文件清单”？
    - 里程碑之间的依赖关系是否来自真实的 import/调用链？能否指出至少 2 条“先做 A 才能做 B”的代码依据？
    - 渲染引擎里程碑是否包含 `foliate-js` 接入、`document.ts` 解析、`FoliateView` 封装三者？对应代码位置在哪？
    - 阅读 UI 里程碑是否覆盖 Header/Footer/Sidebar/Notebook/Annotator 的最小实现？每项的入口组件是哪一个？
    - 书库导入里程碑是否包含“文件选择 -> importBook -> 更新 libraryStore -> 打开 reader”的完整链路？每步对应的函数/文件是什么？
    - 同步/高级功能里程碑是否包含 KOSync、TTS、翻译、校对、AI 等模块？它们在代码中入口分别在哪？
    - 每个里程碑的验收标准是否能映射到具体“可运行操作”？例如点击按钮触发哪条调用链？
    - 是否为每个里程碑给出至少 1 条“可自动化验证”的脚本或最小测试思路？对应哪个模块？
    - 是否明确指出“完成里程碑后可用的页面/路由”？例如 `routes/reader`、`routes/library`。
    - 里程碑的验收是否考虑平台差异（Web/Tauri）？哪些检查只在 Tauri 下成立？
- 验收：完成模块清单 + MVP/Full 对照表 + 里程碑与验收列表。

#### 第 2 课：SvelteKit 最小页面
- 覆盖模块：`apps/br1/src/routes/+layout.svelte`、`apps/br1/src/routes/+page.svelte`。
- 任务：实现最小页面渲染与基础导航结构。
子任务清单：
1. 打开 `apps/readest-app/src/app/layout.tsx`，记录三点：全局 `<head>` 元信息、`<body>` 的包裹结构、全局 Providers 的位置。
2. 打开 `apps/readest-app/src/app/library/page.tsx`，记录三块核心结构：Header、内容区（Bookshelf/空状态）、全局弹窗挂载位置。
3. 在 `+layout.svelte` 中建立与 Readest 对齐的最小壳：`<svelte:head>` 放入 viewport/meta，`<div class=\"app-root\">` 包裹 `<slot />`。
4. 在 `+page.svelte` 中实现“类 Library”骨架：顶部栏（标题 + 按钮）、内容区（网格占位 + 空状态占位），保留将来替换为真实组件的位置。
5. 使用 Svelte 新手友好的写法添加状态：`let hasBooks = false;`，用 `#if` 在空状态/书架占位之间切换。
6. 用 `class:collapsed` 或条件类名实现侧栏折叠的最小交互（即使只是占位按钮）。
7. 补充最小 CSS：全高、布局网格、滚动容器、浅色背景，确保视觉结构接近 `readest-app` 的 Library 页面。
8. 运行 `pnpm -C apps/br1 dev`，确认页面可渲染且交互无报错。
验收问题（需结合源码回答）：
- `+layout.svelte` 中 `<slot />` 放在什么容器里？该容器的职责是什么？
- 当前页面的三段式结构是如何实现的（哪些元素对应 header/aside/main）？
- `+page.svelte` 的导航项来自哪里（数据结构/变量名）？是如何渲染出来的？
- 侧栏折叠由哪个状态控制？折叠状态如何影响 DOM 或样式？
- 页面布局使用了哪些 CSS 规则来保证全高与可滚动？
- 主要内容区域的占位元素是什么？它为什么能代表后续书库/阅读器内容？
- 代码中是否使用了语义化标签（`header`/`nav`/`main`/`aside`）？如果没有，原因是什么？
- 最小页面的可视效果与交互是否在 dev 环境下验证过？验证步骤是什么？
 - 对照 `apps/readest-app/src/app/layout.tsx`，Svelte 版最小壳是否包含等价的 meta 与容器结构？
 - 对照 `apps/readest-app/src/app/library/page.tsx`，Svelte 版页面是否有 Header/内容区/空状态三块对应结构？
 - `hasBooks`/折叠状态的默认值如何设置？如何通过 UI 操作触发变化？

#### 第 3 课：Tauri SPA 模式
- 覆盖模块：`apps/br1/src/routes/+layout.ts`、`apps/br1/svelte.config.js`。
- 任务：设置 `ssr = false` 并验证在 Tauri 下运行。
子任务清单：
1. 先理解概念：
   - SPA = Single Page App（单页应用），只加载一个 HTML，页面切换由前端 JS 完成。
   - SSR = Server-Side Rendering（服务端渲染），页面由服务器先生成 HTML，再交给浏览器。
2. 理解为什么 Tauri 需要 SPA：Tauri 不提供 Node.js 服务器，无法做传统 SSR。
3. 在 `apps/br1/src/routes/+layout.ts` 中设置 `export const ssr = false`。
4. 打开 `apps/br1/svelte.config.js`，确认使用静态 adapter（如 `@sveltejs/adapter-static`）。
5. 在 `apps/br1/README.md` 加一段“为什么禁用 SSR”的解释（1-2 段即可）。
6. 运行 `pnpm -C apps/br1 dev`，确认页面正常渲染。
7. 如果有 Tauri 环境，运行 `pnpm -C apps/br1 tauri dev` 验证不报 SSR 相关错误。
验收问题（需结合源码回答）：
- 用自己的话解释：SPA 与 SSR 的区别是什么？为什么 Tauri 更适合 SPA？
- `ssr = false` 写在 `+layout.ts` 的作用是什么？它会影响哪些页面？
- `adapter-static` 的作用是什么？它和 SPA 有什么关系？
- 如果不禁用 SSR，在 Tauri 中会出现什么问题？是否能从报错或文档中找到依据？
- 目前项目中有哪些页面依赖 `ssr = false`？（举出 1-2 个路由）
- 你在 README 中写了哪些关键点来解释“为什么要禁用 SSR”？
- 你验证 SPA 配置生效的步骤是什么？截图或命令是什么？

#### 第 4 课：Monorepo 与依赖管理
- 覆盖模块：`pnpm-workspace.yaml`、`apps/br1/package.json`。
- 任务：保证 workspace 依赖可解析（如 `foliate-js`）。
子任务清单：
1. 先理解概念：
   - Monorepo：一个仓库管理多个应用与包（`apps/` + `packages/`）。
   - Workspace：包管理器将本地包“链接”到应用里，避免重复发布。
2. 打开 `pnpm-workspace.yaml`，确认包含 `apps/*` 与 `packages/*` 的目录模式。
3. 对照 `apps/readest-app/package.json`，记录阅读器必需的 workspace 依赖（如 `foliate-js`）。
4. 打开 `packages/foliate-js/package.json`，确认包名与入口文件（如 `view.js`）。
5. 在 `apps/br1/package.json` 中添加 `foliate-js: "workspace:*"`，并根据需要加入 `simplecc-wasm` 等本地包。
6. 统一在仓库根目录执行 `pnpm install`（避免子目录安装导致依赖树断裂）。
7. 用最小方式验证依赖可用：运行 `pnpm -C apps/br1 check` 或在 `+page.svelte` 临时 import 并构建通过。
验收问题（需结合源码回答）：
- `pnpm-workspace.yaml` 中哪些路径模式让 `apps/` 与 `packages/` 被识别为 workspace？
- `workspace:*` 的含义是什么？它如何确保使用本地包而不是 npm 上的包？
- `foliate-js` 的实际路径在哪里？它的包名与入口文件是什么？
- `apps/readest-app/package.json` 是如何声明 `foliate-js` 依赖的？`apps/br1` 应该如何对齐？
- 如果 `foliate-js` import 失败，你会优先检查哪些配置文件（列出 2-3 个）？
- `pnpm install` 应该在仓库根目录执行的原因是什么？
- 如何验证依赖是“本地链接”的而不是远程下载的？

#### 第 5 课：脚本与开发流程
- 覆盖模块：`apps/br1/package.json`。
- 任务：补齐 dev/build/check/test 脚本与基本工具链。
子任务清单：
1. 先理解概念：
   - scripts 是项目的“常用命令入口”，统一开发/构建/检查流程。
   - check 是“静态检查”，不运行程序，只做类型/格式/错误提示。
2. 打开 `apps/readest-app/package.json`，观察它的 scripts 分类方式（dev/build/test/check 等）。
3. 在 `apps/br1/package.json` 中新增最小脚本：
   - `dev`: 启动开发服务器。
   - `build`: 构建静态产物。
   - `preview`: 本地预览构建产物。
   - `check`: `svelte-kit sync && svelte-check`。
4. 如果计划加入 lint（可选）：加一个 `lint` 脚本并保留占位说明。
5. 运行 `pnpm -C apps/br1 dev` 确认可启动。
6. 运行 `pnpm -C apps/br1 check` 确认类型检查通过。
7. 运行 `pnpm -C apps/br1 build` 生成产物，观察是否有缺失依赖的报错。
验收问题（需结合源码回答）：
- `apps/br1/package.json` 中有哪些 scripts？每个脚本的用途是什么？
- `check` 脚本为什么要先执行 `svelte-kit sync`？它解决了什么问题？
- `dev` 与 `preview` 的区别是什么？在什么阶段使用？
- `build` 成功后产物输出在哪个目录？如何确认构建产物包含页面？
- 如果 `check` 报错，你会优先查看哪些文件与错误类型？
- 当前是否需要 lint？如果需要，应该把 lint 放在哪个脚本中？

#### 第 6 课：环境变量与配置
- 覆盖模块：`apps/br1/src/app.html`、`apps/br1/src/routes/+layout.svelte`。
- 任务：梳理环境变量的读取与注入位置。
子任务清单：
1. 先理解概念：
   - 环境变量用于区分开发/生产、平台能力、API 地址等配置。
   - SvelteKit 中常用的读取方式有 `import.meta.env` 与 `$env/static/public`。
2. 对照 `apps/readest-app` 的 `.env.*` 文件（如 `.env.web`、`.env.tauri`），列出你需要的 3-5 个关键变量。
3. 约定命名：前端可用的变量统一以 `PUBLIC_`（或 `VITE_`）前缀开头。
4. 在 `+layout.svelte` 中临时输出一个环境变量值（可放在 `console.log`）。
5. 创建 `apps/br1/.env`（或 `.env.local`）并写入测试变量。
6. 运行 `pnpm -C apps/br1 dev`，确认变量值在浏览器中可见。
7. 写一段简短注释说明“哪些变量能在前端读取，哪些只能在服务端使用”。\n
验收问题（需结合源码回答）：
- 你选择了哪种读取方式（`import.meta.env` 还是 `$env`）？原因是什么？
- 哪些变量被你标为“前端可读取”？命名规则是什么？
- 你在 `+layout.svelte` 的哪一行读取了变量？输出结果是什么？
- `apps/readest-app` 的环境变量有哪些？哪些是必须迁移到 SvelteKit 的？
- 如果变量读取不到，你会优先检查哪三个位置（文件/配置）？
- 环境变量在 dev 与 build 下的表现是否一致？如何验证？

#### 第 7 课：路由与导航基础
- 覆盖模块：`apps/br1/src/routes/`。
- 任务：创建 `library` 与 `reader` 路由占位。
基础知识点（SvelteKit 路由与导航，尽量罗列）：
- 文件系统路由：目录名对应 URL 段，`+page.svelte` 是页面入口。
- 布局继承：`+layout.svelte` 会包裹子路由，`<slot />` 决定子页面渲染位置。
- 嵌套路由：`routes/library/+layout.svelte` 可为 library 专属布局。
- 动态路由：`[id]` 表示动态参数，如 `routes/reader/[id]/+page.svelte`。
- 可选参数：`[...ids]` 表示可变数量参数（数组）。
- 查询参数：`?a=1&b=2` 通过 `URLSearchParams` 读取。
- 页面导航：使用 `<a href>` 或 `goto()` 进行客户端导航。
- 导航状态：`$page` store 提供当前 URL 与 params。
- 预取：`data-sveltekit-preload-data` 可控制预取行为。
- 404 行为：未命中路由时显示默认错误页。
- SSR/SPA：`ssr = false` 时路由切换完全在前端完成。
- base 路径：部署在子路径时需要设置 `paths.base`。
- 路由分组：`(group)` 目录仅用于组织，不影响 URL。
- 端点路由：`+page.server.ts` / `+server.ts` 用于服务端数据/接口。
- 共享布局：`routes/+layout.svelte` 可作为全局骨架。
与 readest-app 现有路由对照（Next.js App Router -> SvelteKit）：
- `/`：`apps/readest-app/src/app/page.tsx` -> `apps/br1/src/routes/+page.svelte`
- `/library`：`apps/readest-app/src/app/library/page.tsx` -> `apps/br1/src/routes/library/+page.svelte`
- `/reader`：`apps/readest-app/src/app/reader/page.tsx` -> `apps/br1/src/routes/reader/+page.svelte`
- `/opds`：`apps/readest-app/src/app/opds/page.tsx` -> `apps/br1/src/routes/opds/+page.svelte`
- `/user`：`apps/readest-app/src/app/user/page.tsx` -> `apps/br1/src/routes/user/+page.svelte`
- `/user/layout`：`apps/readest-app/src/app/user/layout.tsx` -> `apps/br1/src/routes/user/+layout.svelte`
- `/user/subscription/success`：`apps/readest-app/src/app/user/subscription/success/page.tsx` -> `apps/br1/src/routes/user/subscription/success/+page.svelte`
- `/auth`：`apps/readest-app/src/app/auth/page.tsx` -> `apps/br1/src/routes/auth/+page.svelte`
- `/auth/callback`：`apps/readest-app/src/app/auth/callback/page.tsx` -> `apps/br1/src/routes/auth/callback/+page.svelte`
- `/auth/error`：`apps/readest-app/src/app/auth/error/page.tsx` -> `apps/br1/src/routes/auth/error/+page.svelte`
- `/auth/recovery`：`apps/readest-app/src/app/auth/recovery/page.tsx` -> `apps/br1/src/routes/auth/recovery/+page.svelte`
- `/auth/update`：`apps/readest-app/src/app/auth/update/page.tsx` -> `apps/br1/src/routes/auth/update/+page.svelte`
- `/updater`：`apps/readest-app/src/app/updater/page.tsx` -> `apps/br1/src/routes/updater/+page.svelte`
- `/offline`：`apps/readest-app/src/app/offline/page.tsx` -> `apps/br1/src/routes/offline/+page.svelte`
- `/error`：`apps/readest-app/src/app/error.tsx` -> `apps/br1/src/routes/+error.svelte`
- `/layout`：`apps/readest-app/src/app/layout.tsx` -> `apps/br1/src/routes/+layout.svelte`
- API 路由（App Router）：`apps/readest-app/src/app/api/*/route.ts` -> `apps/br1/src/routes/api/*/+server.ts`
- API 路由（Pages Router 旧版）：`apps/readest-app/src/pages/api/*.ts` -> `apps/br1/src/routes/api/*/+server.ts`
readest-app 路由所用知识点映射到 SvelteKit：
- App Router 的 `layout.tsx` -> SvelteKit 的 `+layout.svelte`（全局壳与 Providers）。
- `page.tsx` -> `+page.svelte`（页面入口）。
- `route.ts` -> `+server.ts`（API/端点处理）。
- 嵌套路由：`/user/subscription/success` -> 目录多层嵌套。
- 动态段：Next 的 `[ids]` / `[id]` -> SvelteKit 的 `[id]` 或 `[...ids]`。
- 查询参数：Next `useSearchParams` -> SvelteKit `URLSearchParams`。
子任务清单：
1. 先理解概念：
   - SvelteKit 的路由 = 文件系统路由，目录结构就是 URL 结构。
   - `+page.svelte` 是页面入口，`+layout.svelte` 是页面外壳。
2. 新建 `routes/library/+page.svelte`，写一个清晰的占位标题（如 “Library Page”）。
3. 新建 `routes/reader/+page.svelte`，写一个清晰的占位标题（如 “Reader Page”）。
4. 在首页 `+page.svelte` 中添加两个导航链接（使用 `<a href=\"/library\">` 与 `<a href=\"/reader\">`）。
5. 在 `+layout.svelte` 中确保 `<slot />` 能正确渲染子路由内容。
6. 运行 `pnpm -C apps/br1 dev`，点击链接确认页面切换。
7. 记录 URL 变化与页面内容变化，写入一行简短日志或注释（帮助理解路由）。
验收问题（需结合源码回答）：
- `routes/library/+page.svelte` 与 `routes/reader/+page.svelte` 各自对应的 URL 是什么？
- 首页的导航链接是如何写的？是否是相对路径还是绝对路径？
- `+layout.svelte` 的 `<slot />` 位于哪个容器内？它如何影响子页面展示？
- 页面切换时浏览器地址栏如何变化？是否符合文件结构？
- 如果访问不存在的路由会发生什么？SvelteKit 默认行为是什么？
- 你能否在代码中指出“这是路由入口文件”的位置？

#### 第 8 课：项目结构与命名规范
- 覆盖模块：`apps/br1/src/lib/`。
- 任务：建立目录结构与命名规范。
子任务清单：
1. 先理解概念：
   - `src/lib` 是 SvelteKit 中放“可复用模块”的标准位置。
   - 统一的目录结构能减少后续迁移时的混乱。
2. 对照 `apps/readest-app/src/`，列出需要在 br1 中落位的一级模块（components/store/services/utils/libs/hooks/styles）。
3. 在 `apps/br1/src/lib/` 下创建对应目录，并补齐空的 `index.ts` 作为导出入口。
4. 制定命名规范（文件名、组件名、store 命名），写入 `apps/br1/plan.md` 说明区。
5. 在 `apps/br1/src/lib/README.md` 写一段“目录用途说明”，帮助新手理解每个目录的职责。
6. 在 `+page.svelte` 中临时 import 一个空模块（如 `components/index.ts`）验证路径可用。
验收问题（需结合源码回答）：
- `src/lib` 中每个目录的用途是什么？请用一句话说明。
- 你是否建立了与 `apps/readest-app/src/` 对应的落位关系？请举 3 个例子。
- `index.ts` 的作用是什么？在哪些目录中需要它？
- 组件/Store/Service 的命名规范是什么？为什么要这样命名？
- 如果后续迁移 `Reader` 组件，应该放在哪个目录？理由是什么？
- `README.md` 中是否清楚描述了目录用途？新手能否看懂？

### 阶段 B：样式与资源基础（第 9-16 课）
#### 第 9 课：Tailwind 与 daisyui
- 覆盖模块：`apps/br1/tailwind.config.*`、`apps/br1/postcss.config.*`。
- 任务：接入 Tailwind/daisyui 并验证样式生效。
子任务清单：
1. 先理解概念（新手必读）：
   - Tailwind = 工具类 CSS（用类名拼界面）。
   - daisyui = Tailwind 的主题/组件层（提供 `btn`, `card`, `bg-base-200` 等设计语言）。
2. 阅读 Readest 样式设计（对照源码）：
   - `apps/readest-app/tailwind.config.ts`：主题生成、插件、safelist。
   - `apps/readest-app/src/styles/themes.ts`：主题色生成规则（`base-100/200/300` 等）。
   - `apps/readest-app/src/styles/globals.css`：全局样式与 `data-page` 背景逻辑。
   - `apps/readest-app/src/styles/fonts.ts`：字体加载体系。
3. 写一份“样式设计要点”小结（放在本课末尾，至少 6 条）：
   - 例如：`data-theme` 组合命名、`base-100/200/300` 语义、`data-page` 控制背景等。
4. 搭建 br1 的 Tailwind 基础：
   - 安装 `tailwindcss`、`daisyui`、`postcss`、`autoprefixer`。
   - `tailwind.config` 设置 `content` 覆盖 `src/**/*.{svelte,ts}`。
   - 启用 `daisyui`、`@tailwindcss/typography`（先与 readest-app 保持一致）。
5. 复制 Readest 的“主题生成方式”（最小版本）：
   - 在 `apps/br1/src/lib/styles/themes.ts` 中先保留 1~2 个主题（如 `default/sepia`）。
   - `tailwind.config` 中将主题列表映射成 `${name}-light`/`${name}-dark`。
6. 添加 Readest 的“基础全局规则”（最小版本）：
   - 在 `globals.css` 中加入 `@tailwind base/components/utilities`。
   - 加入 `html[data-page='library'] { background: theme('colors.base-200'); }` 等关键规则。
   - 加入 `.full-height`、`foliate-view { display:block; height:100%; }` 等最基本规则。
7. 放一个“样式对照页面”：
   - 在 `+page.svelte` 用 `bg-base-200` 包一层，再用 `card bg-base-100` 做内容区。
   - 加一个 `btn btn-primary`，确认主题与按钮风格生效。
8. 运行 `pnpm -C apps/br1 dev`，对照 Readest 的 Library 页确认整体颜色层级一致。
验收问题（需结合源码回答）：
- Readest 的主题是如何生成的？`themes.ts` 中 `generateLightPalette`/`generateDarkPalette` 的职责是什么？
- `tailwind.config.ts` 里 `daisyui` 的主题数组如何构成？为什么是 `${name}-light`/`${name}-dark`？
- Readest 中 `safelist` 的正则用途是什么？为什么需要它？
- `globals.css` 里 `html[data-page='library']` 与 `html[data-page='reader']` 的背景分别是什么？
- `fonts.ts` 里 Inter 字体的来源与加载方式是什么？在 br1 中如何对齐？
- `eink` 变体是如何添加的？HTML 需要什么属性才能触发？
- 你在 br1 的 `tailwind.config` 中设置了哪些 `content` 路径？是否覆盖了 `src/routes`？
- `globals.css` 里你添加了哪些“最小但关键”的规则？为什么它们必须在第 9 课就完成？
- 对照 Readest 的 Library 页面，你的 br1 页面背景层级是否达到“base-200 外层 + base-100 卡片”？代码如何体现？
- 如果 `btn btn-primary` 没有主题色，你会从哪三处排查？

#### 第 10 课：全局样式迁移
- 覆盖模块：`apps/br1/src/lib/styles/globals.css`。
- 任务：迁移 `apps/readest-app/src/styles/globals.css`。
子任务清单：
1. 先理解作用：`globals.css` 是 Readest 的“全局样式基石”，负责 base 样式、窗口边框、背景、特殊交互类。
2. 打开 `apps/readest-app/src/styles/globals.css`，标记出“必须先迁移”的关键块：
   - `@tailwind` 三条指令
   - `:root` 与 `html[data-page]` 背景设置
   - `.full-height`、`foliate-view` 等基础布局
   - `window-border`/`rounded-window` 等窗口样式
3. 在 `apps/br1/src/lib/styles/globals.css` 中先复制“关键块”，避免一次性搬运过多。
4. 检查路径引用是否正确（字体、图标、背景等）并做必要调整。
5. 在 `apps/br1/src/routes/+layout.svelte` 引入 `globals.css`（或在 `+layout.ts` 中引入）。
6. 运行 `pnpm -C apps/br1 dev`，对照 Readest Library 页检查背景层级与整体排版。
7. 逐步补齐剩余样式块（如 dropdown、drag-over、eink 特殊规则）。
8. 每次补齐后都做一次页面检查，避免一次性改动过大难以排查。
验收问题（需结合源码回答）：
- `globals.css` 中最影响整体视觉的 3 个区块是什么？它们分别作用在哪些页面？
- `html[data-page='library']` 与 `html[data-page='reader']` 的背景规则是否已迁移？代码位置在哪？
- `.full-height` 的高度兼容逻辑是怎样写的？在 br1 中是否生效？
- `foliate-view` 的样式为何必须全局定义？它影响了哪些渲染容器？
- `window-border` 与 `rounded-window` 的样式在 br1 中是否可见？如何验证？
- 迁移过程中你删除或暂缓了哪些块？原因是什么？
- 如果迁移后出现布局错乱，你会优先检查哪些规则？

#### 第 11 课：主题系统与变量
- 覆盖模块：`apps/readest-app/src/styles/themes.ts`、`apps/br1/src/routes/+layout.svelte`。
- 任务：迁移主题定义与 `data-theme` 逻辑。
子任务清单：
1. 先理解概念：
   - Readest 的主题不是简单的 CSS class，而是通过 `data-theme` 组合（如 `default-light`/`default-dark`）。
   - daisyui 依赖 `data-theme` 来切换 `base-100/200/300` 等颜色变量。
2. 打开 `apps/readest-app/src/styles/themes.ts`，理解 `generateLightPalette`/`generateDarkPalette` 如何生成颜色。
3. 在 `apps/br1/src/lib/styles/themes.ts` 中只保留 1~2 个主题（如 `default`/`sepia`），确保最小可用。
4. 在 `apps/br1/src/routes/+layout.svelte` 里读取本地存储（或默认值）并设置 `document.documentElement.dataset.theme`。
5. 加入一个最小主题切换 UI（下拉或按钮），切换时写入 localStorage 并更新 `data-theme`。
6. 运行 `pnpm -C apps/br1 dev`，切换主题并观察背景/按钮颜色变化。
验收问题（需结合源码回答）：
- `generateLightPalette` 与 `generateDarkPalette` 分别生成了哪些颜色键？这些键在 daisyui 中如何使用？
- 主题名称为何要拼接 `-light`/`-dark`？这与 `tailwind.config` 的主题配置如何对齐？
- `data-theme` 是设置在 `html` 还是 `body` 上？为什么？
- 主题切换 UI 在哪个组件/文件中？它修改了哪些存储值？
- 如果主题切换不生效，优先排查哪 3 处配置？
- Readest 中是否支持自定义主题？如果后续需要扩展，哪些函数可复用？

#### 第 12 课：字体体系
- 覆盖模块：`apps/readest-app/src/styles/fonts.ts`。
- 任务：迁移字体逻辑并建立加载入口。
子任务清单：
1. 先理解设计（阅读 `fonts.ts`）：
   - 基础字体：Inter 作为默认 UI 字体（`globals.css` 中的 @font-face）。
   - 额外字体：Google Fonts + CJK 字体列表，按环境动态注入。
   - 自定义字体：本地文件 -> 生成 `@font-face` -> 注入到 document/iframe。
2. 梳理兼容逻辑（代码里有哪些条件分支）：
   - `isCJKEnv`/`isCJK` 决定是否加载 CJK 字体。
   - `mountAdditionalFonts(document, isCJK)` 同时注入 `<link>` 与 `@font-face`。
   - `mountCustomFont(document, font)` 对 iframe 与主文档都可用。
3. 在 br1 中落地最小版本：
   - 复制 `fonts.ts` 到 `apps/br1/src/lib/styles/fonts.ts`。
   - 仅保留 `mountAdditionalFonts` 与 `mountCustomFont` 的最小实现。
   - 暂时不实现自定义字体下载与管理（后续课程再补）。
4. 在 `+layout.svelte` 或 Reader 入口中调用 `mountAdditionalFonts(document)`。
5. 加一个最小“字体切换”示例（下拉选择 2-3 个字体名），并通过 CSS 应用到正文区域（如 `.content`）。
6. 如果涉及 iframe（阅读器），在 FoliateView 加载完成后把字体注入到 iframe 文档。
7. 运行 `pnpm -C apps/br1 dev`，切换字体观察页面变化。
验收问题（需结合源码回答）：
- `fonts.ts` 中哪些函数负责“额外字体链接注入”？哪些负责“@font-face 注入”？
- `mountAdditionalFonts` 如何决定是否加载 CJK 字体？调用链在哪里？
- `createFontCSS` 生成的 CSS 中包含哪些字段？为什么需要 `font-display: swap`？
- 自定义字体在 Readest 中如何命名与去重（`getFontId`、`md5Fingerprint`）？
- 在阅读器 iframe 中如何注入字体？Readest 哪些代码负责这一步？
- 如果字体不生效，你会优先检查哪些步骤（例如 CSS 引用、`document.head` 注入、字体名一致性）？
- br1 的最小实现中，你保留了哪些功能、暂缓了哪些功能？理由是什么？

#### 第 13 课：纹理与背景
- 覆盖模块：`apps/readest-app/src/styles/textures.ts`、`apps/br1/static/`。
- 任务：迁移纹理资源与背景应用逻辑。
子任务清单：
1. 先理解概念（新手友好）：
   - 纹理 = 背景图（如纸张、布料），用于增强阅读氛围。
   - 背景应用方式：通过 CSS `background-image` 或 `background` 设置。
2. 对照 Readest 资源：
   - 查看 `apps/readest-app/public/images/` 里的纹理图（paper/sky/sand 等）。
   - 查看 `apps/readest-app/src/styles/textures.ts` 的纹理列表与命名。
3. 最小实现（先做到“能显示”）：
   - 选 1~2 张纹理图复制到 `apps/br1/static/images/`。
   - 在 `+page.svelte` 中加一个简单的 `<div class=\"bg-sample\">`，用 CSS 设置 `background-image: url('/images/xxx')`。
4. 提升一步（可切换）：
   - 在页面中添加一个下拉选择（两项），切换不同纹理图。
   - 用 Svelte 变量控制 `background-image`。
5. 如果后续要对齐 Readest：
   - 将 `textures.ts` 迁移到 `apps/br1/src/lib/styles/textures.ts`。
   - 把“纹理 ID -> 图片路径”的映射做成数组或对象。
6. 运行 `pnpm -C apps/br1 dev`，确认背景纹理可见且切换生效。
验收问题（需结合源码回答）：
- `textures.ts` 中的纹理列表长什么样？它如何把 ID 映射到图片路径？
- 你在 br1 中把纹理图片放在什么路径？URL 是如何引用的？
- 最小实现中，背景纹理是通过 CSS 哪个属性设置的？
- 纹理切换是如何实现的（变量/条件/事件）？
- 如果背景图不显示，你会优先检查哪三处（路径、CSS、静态资源目录）？

#### 第 14 课：国际化 i18n
- 覆盖模块：`apps/readest-app/src/i18n/i18n.ts`、`apps/readest-app/public/locales/`。
- 任务：迁移 i18n 初始化与多语言资源。
子任务清单：
1. 先理解概念（新手友好）：
   - i18n = 国际化，把文字抽成“字典”，根据语言加载不同文本。
2. 阅读 Readest 的实现：
   - 打开 `apps/readest-app/src/i18n/i18n.ts`，记录初始化方式与语言检测逻辑。
   - 查看 `apps/readest-app/public/locales/`，确认语言文件结构。
3. 选择 Svelte 方案：
   - 如果要接近 Readest，可用 `i18next`（与原逻辑一致）。
   - 如果想更轻量，可用 `svelte-i18n`，但需要改写加载方式。
4. 最小落地步骤（建议先 i18next）：
   - 安装 `i18next` 与 `i18next-browser-languagedetector`。
   - 在 `apps/br1/src/lib/i18n/` 初始化 i18n。
   - 复制 `public/locales/en/translation.json` 和 `public/locales/zh-CN/translation.json` 到 `apps/br1/static/locales/`。
5. 在 `+layout.svelte` 或 `+page.svelte` 中提供语言切换按钮。
6. 渲染一条翻译文本（如 “Your Library”），切换语言验证生效。
7. 记录“如何添加新语言”的步骤说明（1-2 行即可）。
验收问题（需结合源码回答）：
- Readest 的 i18n 初始化在哪个文件？用到了哪些插件/中间件？
- 语言检测使用了什么策略（浏览器语言/本地存储/默认值）？
- 语言资源文件的路径结构是什么？在 br1 中如何对应？
- 你选择了哪种 i18n 方案？选择理由是什么？
- 语言切换按钮触发了哪些 API 调用？状态保存在什么位置？
- 如果翻译不生效，你会检查哪三个位置（初始化、资源路径、调用方式）？

#### 第 15 课：图标与 manifest
- 覆盖模块：`apps/br1/static/`、`apps/br1/src/app.html`。
- 任务：迁移 favicon、manifest 与 PWA meta。
子任务清单：
1. 先理解概念（新手友好）：
   - favicon = 浏览器标签页图标。
   - manifest = PWA 配置文件，描述应用名称、图标、主题色等。
2. 对照 Readest 资源：
   - 查看 `apps/readest-app/public/` 下的 `manifest.json`、`favicon.ico`、`icon.png`、`apple-touch-icon.png`。
   - 记录 `manifest.json` 里的 `name`、`icons`、`theme_color`。
3. 复制最小资源到 br1：
   - `apps/br1/static/manifest.json`
   - `apps/br1/static/favicon.ico`
   - `apps/br1/static/icon.png`、`apple-touch-icon.png`
4. 在 `apps/br1/src/app.html` 中添加 `<link rel=\"manifest\">` 与 `<link rel=\"icon\">` 等 meta。
5. 启动 dev 服务器，打开浏览器检查 favicon 是否显示。
6. 打开 DevTools -> Application -> Manifest，确认 manifest 内容被读取。
7. 如果有移动设备，尝试“添加到主屏幕”验证图标。
验收问题（需结合源码回答）：
- Readest 的 `manifest.json` 中定义了哪些 icon 尺寸？你在 br1 中保留了哪些？
- `app.html` 中增加了哪些 `<link>` 与 `<meta>`？它们的路径指向哪里？
- 浏览器里如何验证 manifest 生效？具体操作步骤是什么？
- 如果 favicon 不显示，你会检查哪三个位置？
- 你在 br1 的 manifest 中是否对齐了 Readest 的应用名称与主题色？如果没有，原因是什么？

#### 第 16 课：响应式与安全区
- 覆盖模块：`apps/readest-app/src/utils/insets.ts`、`apps/readest-app/src/hooks/useSafeAreaInsets.ts`。
- 任务：迁移安全区计算与窗口圆角处理。
子任务清单：
1. 先理解概念（新手友好）：
   - Safe Area = iPhone 刘海/圆角区域，需要留出 padding，避免内容被遮挡。
   - Insets = 四个方向的安全区数值（top/right/bottom/left）。
2. 阅读 Readest 代码：
   - 打开 `utils/insets.ts`，看计算安全区的逻辑与默认值。
   - 打开 `useSafeAreaInsets.ts`，看它如何监听尺寸变化并写入 store。
3. 在 br1 做最小实现：
   - 在 `apps/br1/src/lib/utils/insets.ts` 迁移计算逻辑。
   - 在 `apps/br1/src/lib/stores/theme.ts`（或新建 store）放入 `safeAreaInsets`。
   - 在 `+layout.svelte` 里读取 store 并应用到容器 padding。
4. 添加一个可视化调试：在页面角落显示 inset 数值（开发阶段即可）。
5. 运行 dev，在浏览器模拟移动设备（DevTools Device Mode）检查 padding 是否变化。
6. 如果有真机或 Tauri 移动端，实际打开检查状态栏遮挡情况。
验收问题（需结合源码回答）：
- `useSafeAreaInsets` 如何获取安全区数值？触发更新的事件是什么？
- `utils/insets.ts` 的默认值是什么？如果环境不支持 safe-area，会返回什么？
- 你在 br1 中把安全区数值存放在哪个 store？读取路径是什么？
- 安全区 padding 应用在哪个容器？为什么选择它？
- 如果安全区不生效，你会优先检查哪三处（CSS/env、store 更新、容器样式）？

### 阶段 C：类型/工具/基础库（第 17-24 课）
#### 第 17 课：核心类型迁移
- 覆盖模块：`apps/readest-app/src/types/*.ts`。
- 任务：迁移并统一引用路径。
子任务清单：
1. 先理解概念（新手友好）：
   - 类型文件是“数据合同”，确保代码一致性与可读性。
2. 在 `apps/readest-app/src/types/` 中挑出阅读器相关的核心类型（如 `book.ts`、`view.ts`、`settings.ts`、`annotator.ts`）。
3. 复制到 `apps/br1/src/lib/types/`，保持文件名不变。
4. 在 `apps/br1/tsconfig.json` 配置路径别名（如 `@/lib/*` 或 `$lib/*`），确保能方便引用。
5. 在 `+page.svelte` 中临时 import 2-3 个类型，创建一个最小的类型对象（仅用于编译检查）。
6. 如果有类型冲突或依赖缺失，记录并建立“待修复清单”。
验收问题（需结合源码回答）：
- 哪些类型文件是阅读器最核心的？请列出 3-5 个并说明用途。
- 你在 br1 中放置类型文件的目录结构是什么？与 readest-app 是否一致？
- 路径别名配置在哪个文件？别名的具体写法是什么？
- 你在示例中引用了哪些类型？它们来自哪个文件？
- 如果类型报错，你会先检查哪三处（路径别名、依赖类型、TS 配置）？

#### 第 18 课：基础工具函数（1）
- 覆盖模块：`apps/readest-app/src/utils/misc.ts`、`time.ts`、`number.ts`。
- 任务：迁移并补 `browser` 判断。
子任务清单：
1. 先理解概念（新手友好）：
   - 工具函数 = 通用的小功能，很多地方都会复用，必须可靠。
2. 打开 `misc.ts`、`time.ts`、`number.ts`，标记哪些函数会访问 `window`、`document`、`navigator`。
3. 复制到 `apps/br1/src/lib/utils/`，保持文件名一致。
4. 在涉及浏览器对象的函数里加入 `if (typeof window === 'undefined')` 等保护。
5. 在 `+page.svelte` 中写 2-3 个最小调用示例（如格式化时间、生成随机 id）。
6. 运行 `pnpm -C apps/br1 dev`，确保不会在启动时报错。
验收问题（需结合源码回答）：
- `misc.ts` 中哪些函数依赖浏览器对象？你是如何处理的？
- `time.ts` 与 `number.ts` 提供了哪些关键功能？举 2-3 个例子。
- 你在 br1 中放置这些工具的路径是什么？与 readest-app 是否一致？
- 如果在 SSR 环境调用这些函数会发生什么？你的防护如何避免？
- 你验证工具函数可用的方法是什么？

#### 第 19 课：基础工具函数（2）
- 覆盖模块：`apps/readest-app/src/utils/path.ts`、`file.ts`、`storage.ts`。
- 任务：迁移文件/路径/存储工具。
子任务清单：
1. 先理解概念（新手友好）：
   - 路径工具：解决 Windows/Unix 分隔符与 URI 兼容问题。
   - 文件工具：支持本地文件与远程文件的分块读取与缓存。
   - 存储工具：识别对象存储类型（如 r2/s3）。
2. 代码清单（列出所有工具函数/类，来自源码）：
   - `path.ts`：
     - `getFilename(fileOrUri)`
     - `getBaseFilename(filename)`
     - `getDirPath(filePath)`
     - `joinPaths(...paths)`（基于 Tauri `@tauri-apps/api/path`）
   - `storage.ts`：
     - `getStorageType()`
   - `file.ts`：
     - `DeferredBlob`：`arrayBuffer()`、`text()`、`stream()`、`type` getter
     - `NativeFile`：`open()`、`close()`、`stat()`、`seek()`、`readData()`、`slice()`、`stream()`、`text()`、`arrayBuffer()`（内部缓存：`#readAndCacheChunkSafe`、`#updateAccessOrder`、`#ensureCacheSize`）
     - `RemoteFile`：`open()`、`close()`、`fetchRangePart()`、`fetchRange()`、`slice()`、`text()`、`arrayBuffer()`（内部缓存：`#fetchAndCacheChunkSafe`、`#updateAccessOrder`、`#ensureCacheSize`）
3. 逐步实现（建议顺序）：
   1) 迁移 `path.ts`，先保证字符串路径处理正确（包含 URL/URI）。
   2) 迁移 `storage.ts`，确认环境变量读取路径。
   3) 迁移 `DeferredBlob`，确保 `arrayBuffer/text/stream` 行为一致。
   4) 迁移 `NativeFile` 的 `open/close/slice`，再补缓存与 `readData`。
   5) 迁移 `RemoteFile` 的 `open/fetchRange`，再补缓存与 `slice`。
4. 常见坑与验证提醒：
   - URL/URI 解码：`getFilename` 会先 `decodeURI`，避免中文路径乱码。
   - Windows 路径：`\\` 必须归一化为 `/` 再 split。
   - Tauri 依赖：`joinPaths` 依赖 Tauri API，Web 环境需考虑替代或保护。
   - Range 请求：`RemoteFile.fetchRange` 的 end 是**包含**，与 `slice` 的 end 不同。
   - Android：`RemoteFile.open()` 在 Android 用 `Range` 代替 `HEAD`。
   - 缓存大小：`MAX_CACHE_CHUNK_SIZE`、`MAX_CACHE_ITEMS_SIZE` 影响内存。
5. 最小验证（每步都能验证）：
   - `path.ts`：输入 `C:\\a\\b\\c.epub` 与 `file:///a/b/c.epub`，检查返回值。
   - `storage.ts`：设置 `NEXT_PUBLIC_OBJECT_STORAGE_TYPE`，确认返回值。
   - `NativeFile`：读取一个小文件，验证 `slice().text()`。
   - `RemoteFile`：对一个带 Range 的资源做 `fetchRange`，验证长度。
验收问题（需结合源码回答）：
- `getFilename` 为什么要对 URL/URI 做 `decodeURI`？否则会出现什么问题？
- `getBaseFilename` 如何处理多重后缀（如 `.tar.gz`）？
- `joinPaths` 依赖的 Tauri API 是什么？在 Web 环境下是否有替代方案？
- `DeferredBlob` 为什么需要重写 `arrayBuffer` 与 `text`？它解决了什么问题？
- `NativeFile.readData` 如何决定走缓存还是直接读？缓存粒度由哪个常量控制？
- `RemoteFile.open` 为什么在 Android 走 Range 而不是 HEAD？相关代码在哪里？
- `fetchRange` 与 `slice` 的 end 边界差异是什么？如何避免 off-by-one？
- 你如何验证缓存命中（`#cache`）生效？可以用什么日志或断点？
- 如果 `fetchRange` 失败，你会先检查哪三处（CORS、Range 支持、URL 可访问）？

#### 第 20 课：基础工具函数（3）
- 覆盖模块：`apps/readest-app/src/utils/event.ts`、`queue.ts`、`throttle.ts`、`debounce.ts`。
- 任务：迁移事件总线与节流/防抖。
子任务清单：
1. 先理解概念（新手友好）：
   - 事件总线：用于跨组件通信（发布/订阅）。
   - 节流（throttle）：一段时间内最多执行一次。
   - 防抖（debounce）：停止触发一段时间后再执行。
   - 异步队列：按顺序处理异步任务。
2. 代码清单（列出所有函数/类，来自源码）：
   - `event.ts`：`EventDispatcher`（`on/off/dispatch`、`onSync/offSync/dispatchSync`）。
   - `queue.ts`：`AsyncQueue`（`enqueue/finish/dequeue`）。
   - `throttle.ts`：`throttle(func, delay, { emitLast })`。
   - `debounce.ts`：`debounce(func, delay, { emitLast })` + `flush/cancel`。
3. 逐步实现（建议顺序）：
   1) 先迁移 `EventDispatcher`，在 Svelte 中保持单例导出。
   2) 迁移 `AsyncQueue`，理解 `finish()` 的作用。
   3) 迁移 `throttle`，确认 `emitLast` 行为。
   4) 迁移 `debounce`，确保 `flush/cancel` 可用。
4. 常见坑与验证提醒：
   - `dispatchSync` 会从后往前遍历监听器，确保“最后注册优先消费”。
   - `debounce` 的 `emitLast=false` 与普通 debounce 语义相反，注意对照源码。
   - `AsyncQueue.dequeue` 可能返回 `null`，调用侧要处理结束条件。
5. 最小验证（每步都能验证）：
   - 在 `+page.svelte` 里创建按钮，点击时 `dispatch` 一个事件并在订阅里 `console.log`。
   - 用 `throttle` 包裹按钮点击，观察限制频率。
   - 用 `debounce` 包裹输入框事件，观察延迟触发与 `flush`。
   - 用 `AsyncQueue` 模拟异步消费（手动 enqueue/finish）。
验收问题（需结合源码回答）：
- `EventDispatcher` 的异步与同步监听器有什么区别？分别用于什么场景？
- `dispatchSync` 为什么倒序遍历监听器？这带来什么行为差异？
- `debounce` 的 `emitLast=false` 在代码中实际做了什么？与常规认知有何不同？
- `debounce.flush` 与 `debounce.cancel` 的作用分别是什么？在什么场景需要？
- `throttle` 在 `emitLast=true` 时如何处理最后一次调用？
- `AsyncQueue.finish` 被调用后，`dequeue` 会返回什么？为什么？
- 如果事件没有被触发，你会检查哪三处（订阅时机、事件名、派发参数）？

#### 第 21 课：阅读相关工具
- 覆盖模块：`apps/readest-app/src/utils/book.ts`、`cfi.ts`、`xcfi.ts`、`toc.ts`、`serializer.ts`。
- 任务：迁移 CFI/目录/序列化相关工具。
子任务清单：
1. 先理解概念（新手友好）：
   - CFI = EPUB 的“精确位置标识”，用于保存阅读位置与批注。
   - XPointer = KOReader 使用的定位格式，与 CFI 可互转。
   - TOC = 目录树，关联章节与位置。
   - 序列化 = 把配置对象保存为 JSON，减少冗余字段。
2. 代码清单（列出所有工具函数/类，来自源码）：
   - `book.ts`：
     - 基础路径与文件名：`getDir`、`getLibraryFilename`、`getLibraryBackupFilename`、`getRemoteBookFilename`、`getLocalBookFilename`、`getCoverFilename`、`getConfigFilename`、`isBookFile`
     - 格式化与语言：`listFormater`、`getBookLangCode`、`formatAuthors`、`formatTitle`、`formatDescription`、`formatPublisher`、`formatLanguage`、`getPrimaryLanguage`、`formatDate`、`formatBytes`
     - 进度与方向：`getCurrentPage`、`getBookDirFromWritingMode`、`getBookDirFromLanguage`
     - 元数据：`getMetadataHash`
     - 常量：`INIT_BOOK_CONFIG`
   - `cfi.ts`：`isCfiInLocation`
   - `xcfi.ts`：
     - `XCFI` 类：`extractSpineIndex`、`xPointerToCFI`、`cfiToXPointer`、`validateCFI`、`validateXPointer`
     - 私有逻辑：`parseXPointer`、`resolveXPointerPath`、`convertPointXPointerToCFI`、`convertRangeXPointerToCFI`、`findTextNodeAtOffset`、`buildXPointerPath`、`handleTextOffset`、`handleTextOffsetInElement`、`rangePointToXPointer`、`adjustSpineIndex`、`collectTextNodes`、`isSignificantElement`
     - 外部函数：`getCFIFromXPointer`、`getXPointerFromCFI`、`normalizeProgressXPointer`
   - `toc.ts`：`findParentPath`、`findTocItemBS`、`updateToc`（内部：`findInSubitems`、`convertTocLabels`、`updateTocData`、`sortTocItems`）
   - `serializer.ts`：`serializeConfig`、`deserializeConfig`、`compressConfig`
3. 逐步实现（建议顺序）：
   1) 迁移 `book.ts` 中基础路径/格式化函数（先不涉及复杂依赖）。
   2) 迁移 `cfi.ts`，确保 `foliate-js/epubcfi.js` 可用。
   3) 迁移 `toc.ts`，先让目录能跑通，再接 `simplecc`。
   4) 迁移 `serializer.ts`，确保配置可保存与恢复。
   5) 最后迁移 `xcfi.ts`（复杂度最高），分段测试。
4. 常见坑与验证提醒：
   - `getRemoteBookFilename` 依赖 `getStorageType()`，r2 与 s3 的路径规则不同。
   - `getFilename`/`getBaseFilename` 会处理 URI/Windows 路径，注意解码与分隔符。
   - `formatDescription` 会用正则移除 HTML 与实体，可能导致文本缺失。
   - `getCurrentPage` 对 PDF 与 EPUB 的进度字段不同（`section` vs `pageinfo`）。
   - `toc.updateToc` 会按 `sizePerLoc` 计算 location，目录排序与章节长度有关。
   - `xcfi` 中 CFI 与 XPointer 的索引是 0/1 基差异，最容易 off-by-one。
   - `normalizeProgressXPointer` 会移除尾部 `text().N`，影响精度但提高兼容性。
   - `serializeConfig` 会移除与全局设置相同的字段（减少冗余）。
5. 最小验证（每步都能验证）：
   - `book.ts`：用一个虚拟 `Book` 对象生成文件名/格式化作者/日期。
   - `cfi.ts`：给一个 CFI 与 location，验证 `isCfiInLocation` 返回值。
   - `toc.ts`：用模拟 `bookDoc.sections/toc` 生成 `location` 与 `cfi`。
   - `serializer.ts`：序列化后再反序列化，检查字段是否恢复。
   - `xcfi.ts`：用同一段文档来回转换 CFI <-> XPointer，检查是否一致。
验收问题（需结合源码回答）：
- `getRemoteBookFilename` 在 r2 与 s3 下生成的路径差异是什么？代码在哪里体现？
- `formatAuthors` 为什么需要 `LASTNAME_AUTHOR_SORT_LANGS`？它影响哪些语言？
- `getMetadataHash` 的输入组合是什么？为什么要 `normalize('NFC')`？
- `getCurrentPage` 如何区分 PDF 与 EPUB？使用了哪些 progress 字段？
- `isCfiInLocation` 使用了 `CFI.collapse` 与 `CFI.compare`，其逻辑含义是什么？
- `updateToc` 的 `sizePerLoc` 作用是什么？它如何影响目录定位？
- `findTocItemBS` 为何使用二分查找？它依赖 TOC 的哪种排序？
- `serializeConfig` 为什么要过滤与全局设置相同的字段？这对存储有什么好处？
- `compressConfig` 返回值类型是否与函数签名一致？如果不一致，如何修正？
- `XCFI.extractSpineIndex` 如何从 CFI 中得到 spine index？CFI 为什么是偶数步长？
- `cfiToXPointer` 与 `xPointerToCFI` 的核心差异是什么？哪里处理了 text offset？
- `normalizeProgressXPointer` 会删掉哪些信息？这会带来什么精度/兼容性权衡？

#### 第 22 课：样式与排版工具
- 覆盖模块：`apps/readest-app/src/utils/style.ts`、`css.ts`、`rtl.ts`、`a11y.ts`。
- 任务：迁移排版与无障碍工具。
子任务清单：
1. 先理解概念（新手友好）：
   - `style.ts` 负责把阅读设置转成 CSS 字符串注入到 iframe。
   - `css.ts` 负责校验/格式化用户自定义 CSS。
   - `rtl.ts` 决定左右方向（RTL/LTR）。
   - `a11y.ts` 处理可访问性（如去掉 tab 索引）。
2. 代码清单（列出所有函数/模块，来自源码）：
   - `style.ts`：
     - 生成样式：`getStyles`、`getThemeCode`
     - 注入辅助：`applyTranslationStyle`
     - 变换样式：`transformStylesheet`
     - 应用类名：`applyThemeModeClass`、`applyScrollModeClass`
     - 处理元素：`applyImageStyle`、`applyTableStyle`、`keepTextAlignment`
     - 版式：`applyFixedlayoutStyles`
     - 样式片段：`getFontStyles`、`getColorStyles`、`getLayoutStyles`、`getFootnoteStyles`、`getTranslationStyles`
   - `css.ts`：`validateCSS`、`formatCSS`
   - `rtl.ts`：`getDirFromLanguage`、`getDirFromUILanguage`
   - `a11y.ts`：`removeTabIndex`
3. 逐步实现（建议顺序）：
   1) 先迁移 `rtl.ts` 与 `a11y.ts`（简单、无外部依赖）。
   2) 迁移 `css.ts`，先验证 `validateCSS/formatCSS`。
   3) 迁移 `style.ts` 的 **最小子集**：`getThemeCode`、`getFontStyles`、`getColorStyles`、`getStyles`。
   4) 再迁移 `applyThemeModeClass`、`applyScrollModeClass`、`applyImageStyle`。
   5) 最后补 `transformStylesheet` 与 `applyFixedlayoutStyles`（复杂度高）。
4. 常见坑与验证提醒：
   - `getStyles` 依赖 `ViewSettings` 与 `themes.ts`，需保证字段完整。
   - `getThemeCode` 读取 localStorage，SSR 下要防护。
   - `transformStylesheet` 会替换 `px/pt/vw/vh`，容易导致排版差异。
   - `applyTableStyle` 会强行缩放表格，可能影响 CSS 布局。
   - `removeTabIndex` 会影响链接可访问性，务必确认场景。
5. 最小验证（每步都能验证）：
   - `rtl.ts`：输入 `ar`/`en`，验证返回 `rtl`/`auto`。
   - `css.ts`：给一段错误 CSS，确认 `validateCSS` 返回错误信息。
   - `style.ts`：用假 `viewSettings` 生成 CSS，检查包含 `--font-size` 与 `--theme-bg-color`。
   - `applyThemeModeClass`：切换 dark/light，观察 class 变化。
验收问题（需结合源码回答）：
- `getStyles` 最终拼接了哪些样式段？顺序是否重要？
- `getThemeCode` 从 localStorage 读了哪些 key？如何决定 dark/light？
- `getFontStyles` 中默认字体与 CJK 字体是如何组合的？
- `transformStylesheet` 为什么要替换 `vw/vh` 与绝对 `px`？它会带来什么副作用？
- `applyImageStyle` 如何判断图片是否为“inline image”？它添加了什么 class？
- `applyTableStyle` 如何计算表格宽度？缩放逻辑如何避免溢出？
- `css.ts` 的 `validateCSS` 能抓住哪些错误？哪些情况它可能漏掉？
- `removeTabIndex` 为什么只对 `<a>` 生效？是否影响可访问性？

#### 第 23 课：书籍解析库
- 覆盖模块：`apps/readest-app/src/libs/document.ts`。
- 任务：迁移书籍解析与格式加载逻辑。
子任务清单：
1. 先理解概念（新手友好）：
   - `document.ts` 是“书籍解析入口”，负责把 File 解析成 `BookDoc`。
   - 解析逻辑会根据文件类型选择不同加载器（EPUB/PDF/MOBI/FB2/CBZ）。
2. 代码清单（来自源码）：
   - 类型/常量：`BookDoc`、`BookMetadata`、`TOCItem`、`SectionItem`、`EXTS`、`MIMETYPES`。
   - 解析类：`DocumentLoader`（`isZip`、`isPDF`、`makeZipLoader`、`open`）。
   - 工具函数：`getDirection`、`getFileExtFromMimeType`、`getMimeTypeFromFileExt`。
3. 逐步实现（建议顺序）：
   1) 先迁移类型与常量（`BookDoc`/`EXTS`/`MIMETYPES`），保证工具函数可编译。
   2) 迁移 `getDirection`、`getFileExtFromMimeType`、`getMimeTypeFromFileExt`。
   3) 迁移 `DocumentLoader` 的 `isZip/isPDF`（检测文件类型）。
   4) 迁移 `makeZipLoader`（zip 读取 + entries + loadText/loadBlob）。
   5) 迁移 `open()`，按顺序处理 ZIP/EPUB/CBZ/FBZ/PDF/MOBI/FB2。
4. 常见坑与验证提醒：
   - `makeZipLoader` 使用 `@zip.js/zip.js`，注意 `useWebWorkers=false`。
   - `open()` 中的 `makePDF` 依赖 PDF.js 资源，可能需要先配置 vendor 复制脚本。
   - MOBI 解析依赖 `fflate`，需要确认依赖存在。
   - `DocumentFile` 在 Web 与 Tauri 环境下可能不同（`File` vs 自定义 `NativeFile`）。
   - `getDirection` 依赖 `document.defaultView`，SSR 环境要注意。
5. 最小验证（每步都能验证）：
   - 准备一个小 EPUB 与 PDF，调用 `new DocumentLoader(file).open()`。
   - 打印 `format` 是否正确（EPUB/PDF）。
   - 打印 `book.metadata.title`、`book.toc.length`、`book.sections.length`。
   - 调用 `getDirection(doc)`，确认返回 `vertical/rtl` 合理。
验收问题（需结合源码回答）：
- `DocumentLoader.open()` 的分支顺序是什么？为什么 ZIP 在最前面？
- `isZip`/`isPDF` 如何判断文件格式？读取了文件的哪几个字节？
- `makeZipLoader` 返回了哪些能力（loadText/loadBlob/getSize/getComment）？它们分别怎么用？
- `open()` 中 CBZ/FBZ/EPUB 的处理流程有何不同？使用了哪些 `foliate-js` 模块？
- MOBI 解析为什么需要 `fflate`？`isMOBI` 的判断来自哪里？
- `getFileExtFromMimeType` 与 `getMimeTypeFromFileExt` 的返回策略是什么？找不到时返回什么？
- 如果解析失败，`open()` 会抛出哪些错误？哪里会转成“Unsupported or corrupted book file”？

#### 第 24 课：基础业务库
- 覆盖模块：`apps/readest-app/src/libs/storage.ts`、`sync.ts`、`edgeTTS.ts`、`mediaSession.ts`。
- 任务：迁移存储、同步、TTS 相关基础库。
子任务清单：
1. 先理解概念（新手友好）：
   - `storage.ts`：云端文件上传/下载/删除/统计。
   - `sync.ts`：书籍/配置/笔记的同步接口（pull/push）。
   - `edgeTTS.ts`：Edge 在线朗读服务的实现（WebSocket + SSML）。
   - `mediaSession.ts`：系统媒体控制（锁屏/通知栏）。
2. 代码清单（来自源码）：
   - `storage.ts`：`createProgressHandler`、`uploadFile`、`batchGetDownloadUrls`、`downloadFile`、`deleteFile`、`getStorageStats`。
   - `sync.ts`：`SyncClient`（`pullChanges`、`pushChanges`）、`SyncType/SyncOp`、`SyncResult`。
   - `edgeTTS.ts`：`EDGE_SPEECH_URL`、`EDGE_TTS_VOICES`、`generateSecMsGec`、`genVoiceList` 等。
   - `mediaSession.ts`：`TauriMediaSession`、`getMediaSession`、`updateMetadata`、`updatePlaybackState`、`setActive`。
3. 逐步实现（建议顺序）：
   1) 迁移 `storage.ts` 的 `getStorageStats`/`deleteFile`（简单请求）。
   2) 迁移 `uploadFile`/`downloadFile`，先让 Web 版本可用，再补 Tauri 分支。
   3) 迁移 `sync.ts` 的 `SyncClient`（pull/push）。
   4) 迁移 `mediaSession.ts`，先实现 Web `navigator.mediaSession` 分支，再补 Tauri 分支。
   5) 最后迁移 `edgeTTS.ts`（体量大），先让“获取 voice 列表”可用。
4. 常见坑与验证提醒：
   - `storage.ts` 依赖 `getAPIBaseUrl`、`fetchWithAuth`，要先准备环境变量与鉴权。
   - Web 与 Tauri 上传/下载分支不同，接口与权限都不同。
   - `SyncClient` 需要 `getAccessToken`，未登录会直接报错。
   - `edgeTTS` 使用 WebSocket 与 token 生成逻辑，依赖 `crypto`、`ws`、`createHash`。
   - `mediaSession` 在 Tauri Android 走插件事件，需确认权限。
5. 最小验证（每步都能验证）：
   - `storage.ts`：用 mock token 调用 `getStorageStats`（或先打印请求 URL）。
   - `sync.ts`：用 mock token 调用 `pullChanges`，观察错误信息是否合理。
   - `mediaSession.ts`：在浏览器控制台调用 `navigator.mediaSession`，确认对象存在。
   - `edgeTTS.ts`：调用 `genVoiceList` 生成列表并渲染 1~2 个条目。
验收问题（需结合源码回答）：
- `uploadFile` 为什么先请求 `uploadUrl` 再真正上传？这个流程在代码里如何体现？
- `downloadFile` 在 Web 与 Tauri 下分别走哪套方法？关键分支条件是什么？
- `createProgressHandler` 如何把单文件进度转换为整体进度？
- `SyncClient.pullChanges` 的参数 `since/type/book/meta_hash` 在 URL 中如何拼接？
- `SyncClient.pushChanges` 的 payload 结构是什么？为什么需要分 books/configs/notes？
- `edgeTTS` 的 `generateSecMsGec` 解决了什么问题？为什么要用 Windows epoch？
- `EDGE_TTS_VOICES` 的结构是什么？`genVoiceList` 如何转成可用列表？
- `mediaSession.ts` 中 Web 与 Tauri 分支的判断逻辑是什么？它依赖哪些平台检测？
- `TauriMediaSession` 初始化监听时注册了哪些事件？分别对应哪种控制动作？

### 阶段 D：服务层与上下文（第 25-32 课）
#### 第 25 课：环境与平台检测
- 覆盖模块：`apps/readest-app/src/services/environment.ts`。
- 任务：迁移平台识别与 API Base URL 选择逻辑，并为 AppService 的动态加载做准备。
子任务清单：
1. 先理解概念（新手友好）：
   - 平台识别是“环境变量 + 运行时检测”的组合：环境变量负责大分支，浏览器 API 负责细分。
   - dev-web 走 `/api` 代理，生产与 tauri 走完整域名。
   - AppService 用动态 import 延迟加载，避免在不支持的运行时执行。
2. 代码清单（来自源码）：
   - 平台判断：`isTauriAppPlatform`、`isWebAppPlatform`、`hasCli`、`isPWA`。
   - API 地址：`getBaseUrl`、`getNodeBaseUrl`、`getAPIBaseUrl`、`getNodeAPIBaseUrl`、`isWebDevMode`。
   - AppService 选择与缓存：`EnvConfigType`、`environmentConfig.getAppService`、`getNativeAppService`、`getWebAppService`、`nativeAppService`、`webAppService`。
3. 逐步实现（建议顺序）：
   1) 在 SvelteKit 中建立环境读取封装（优先 `import.meta.env`），准备 `NEXT_PUBLIC_APP_PLATFORM`、`NEXT_PUBLIC_API_BASE_URL`、`NEXT_PUBLIC_NODE_BASE_URL`。
   2) 迁移 `isTauriAppPlatform`/`isWebAppPlatform`，先只对环境变量做判断，写一个页面级调试输出。
   3) 迁移 `hasCli`/`isPWA`，为 `window`/`matchMedia` 增加 SSR 保护。
   4) 迁移 `getBaseUrl`/`getNodeBaseUrl`，补齐 `READEST_WEB_BASE_URL`/`READEST_NODE_BASE_URL` 常量。
   5) 实现 `isWebDevMode` 与 `getAPIBaseUrl`/`getNodeAPIBaseUrl` 的 dev-web 分支。
   6) 迁移 `environmentConfig.getAppService` 的“动态 import + 缓存 + init”模式（先保留空实现）。
   7) 在 `+page.svelte` 打印：平台判断、`getAPIBaseUrl()`、`getNodeAPIBaseUrl()`、`isPWA()`。
4. 常见坑与验证提醒：
   - SvelteKit 默认没有 `process.env`，需用 `import.meta.env` 或自建封装映射。
   - `window`、`matchMedia` 在 SSR 不存在，必须用 `typeof window !== 'undefined'` 守护。
   - `NEXT_PUBLIC_APP_PLATFORM` 未设置时会导致平台判断全部 false，进而 `getAppService` 默认走 Web。
   - dev-web 才能用 `/api`，tauri/production 必须返回完整 `https://.../api`。
   - 动态 import 只在浏览器执行，避免在 server 端调用 `getAppService`。
5. 最小验证（每步都能验证）：
   - `.env` 设置 `NEXT_PUBLIC_APP_PLATFORM=web`，确认 `isWebAppPlatform()` 为 true。
   - 切换为 `tauri`，确认 `getAPIBaseUrl()` 返回完整 URL 而非 `/api`。
   - 在浏览器控制台观察 `isPWA()`，非 PWA 时应为 false。
   - 临时在 `getAppService` 中加入日志，确认只初始化一次。
验收问题（需结合源码回答）：
- `isWebDevMode` 为什么要同时检查 `NODE_ENV` 与 `isWebAppPlatform`？在 tauri dev 会发生什么？
- `getAPIBaseUrl` 与 `getNodeAPIBaseUrl` 的差异点是什么？什么情况必须用 Node API？
- `getBaseUrl` 的默认值来自哪两个常量？它们在什么文件定义？
- `environmentConfig.getAppService` 为什么用动态 import？这个设计如何避免 Web/Native 互相引用？
- `nativeAppService`/`webAppService` 为什么需要模块级缓存？如果没有缓存会发生什么？
- `hasCli` 读取的全局变量由谁注入？在哪个运行时才应该出现？
- `isPWA` 使用 `display-mode: standalone` 判断，有哪些浏览器兼容差异需要补充？

#### 第 26 课：AppService 体系
- 覆盖模块：`apps/readest-app/src/services/appService.ts`、`webAppService.ts`、`nativeAppService.ts`。
- 任务：建立服务接口与平台实现，让“同一套上层逻辑在 Web 与 Tauri 上运行”。
子任务清单：
1. 先理解概念（新手友好）：
   - AppService 是“平台能力的门面”，上层只关心读写书籍/设置，不关心平台差异。
   - BaseAppService 提供通用业务（设置、书库、导入/导出），FileSystem 负责平台差异。
   - Web 版用 IndexedDB 模拟文件系统；Native 版用 Tauri 文件系统与路径解析器。
2. 代码清单（来自源码）：
   - `appService.ts`：`BaseAppService`、`getDefaultViewSettings`、`loadSettings`、`saveSettings`、`importBook`、`deleteBook`、`uploadBook`、`downloadBook`、`loadBookContent`、`loadBookConfig`、`saveBookConfig`、`loadLibraryBooks`、`saveLibraryBooks`、`safeLoadJSON`、`safeSaveJSON`、`migrate20251124`。
   - `webAppService.ts`：`indexedDBFileSystem`（`resolvePath`/`getPrefix`/`readFile`/`writeFile`/`readDir`/`exists`/`stats` 等）、`WebAppService.init`、`WebAppService.runMigrations`、`saveFile`、`ask`。
   - `nativeAppService.ts`：`nativeFileSystem`、`getPathResolver`、`NativeAppService.init`、`runMigrations`、`setCustomRootDir`、`selectDirectory`、`selectFiles`、`saveFile`、`ask`、`migrate20251029`。
   - 类型依赖：`apps/readest-app/src/types/system.ts`（`AppService`/`FileSystem`/`BaseDir`）。
3. 逐步实现（建议顺序）：
   1) 先迁移 `types/system.ts` 的 `AppService`/`FileSystem`，缩成 MVP 版本（只保留本课会用到的方法）。
   2) 在 `apps/br1/src/services/` 新建 `webAppService.ts`：先实现 `resolvePath` + IndexedDB 的 `readFile`/`writeFile`/`exists`/`getPrefix`。
   3) 建立 `BaseAppService`：先实现 `prepareBooksDir`、`resolveFilePath`、`getDefaultViewSettings`、`loadSettings`/`saveSettings`。
   4) 加上 `safeLoadJSON`/`safeSaveJSON`（`.bak` 备份策略），验证“损坏文件可回滚”。
   5) 实现书库最小链路：`loadLibraryBooks`/`saveLibraryBooks` + `generateCoverImageUrl`（Web 用 Blob URL）。
   6) 实现 `importBook` 的最小分支：只处理浏览器 `File`（先不支持路径/URI），让“导入后可在书库看到”。
   7) 加入 `WebAppService`（`init`/`runMigrations`/`saveFile`/`ask`），并从第 25 课的 `getAppService` 调用。
   8) 建一个 `NativeAppService` 骨架：只设置平台标记与 `selectFiles`/`saveFile` 的 stub（后续第 30 课补齐）。
4. 常见坑与验证提醒：
   - `BaseAppService.loadSettings` 合并默认值顺序很关键，若顺序错会覆盖用户设置。
   - `safeLoadJSON`/`safeSaveJSON` 依赖 `.bak` 文件策略，路径必须与主文件一致。
   - `importBook` 用 `partialMD5` 去重，若你用 `File` 的 arrayBuffer 多次读取需注意性能与内存。
   - `generateCoverImageUrl` 在 Web 用 Blob URL，Native 用文件路径，不能混用。
   - IndexedDB 在 SSR 不可用；`webAppService` 必须只在浏览器执行。
   - Web 端 `selectDirectory`/`selectFiles` 不支持，调用需要明确降级方案。
5. 最小验证（每步都能验证）：
   - 调用 `loadSettings()`，确认 `localBooksDir` 与默认值正常合并。
   - 调用 `saveSettings()` 后刷新页面，确认数据能恢复。
   - `saveLibraryBooks()` 写入 1 条假数据，再 `loadLibraryBooks()` 回读。
   - 通过 `<input type="file">` 选 `.txt` 或 `.epub`，触发 `importBook()`，确认书库更新。
   - 调 `generateCoverImageUrl()`，在页面渲染一张封面图。
验收问题（需结合源码回答）：
- `BaseAppService.loadSettings` 为什么要先构造 `defaultSettings`，再和已有设置合并？合并顺序在代码里如何体现？
- `getDefaultViewSettings` 为什么要按 `isMobile`/`isEink`/`isCJKEnv` 叠加默认值？具体叠加了哪些常量？
- `importBook` 中 `transient` 的作用是什么？为什么 `transient` 只允许文件路径？
- 导入时如果书名为空或等于文件名，代码如何处理标题？是哪一段逻辑保证的？
- 处理 `.txt` 书籍时为什么会走 `TxtToEpubConverter`？转换结果如何回到后续流程？
- `safeLoadJSON` 的“主文件损坏”判定标准是什么？从备份恢复后会执行哪些写回操作？
- `safeSaveJSON` 为什么“先写备份再写主文件”？如果主文件写失败，用户会看到什么结果？
- `generateCoverImageUrl` 在 Web 与 Native 的分支条件是什么？各自返回的 URL 形态为何不同？
- `webAppService` 的 IndexedDB 表结构是什么？`resolvePath` 如何影响存储 key？
- `nativeAppService` 的 `getPathResolver` 如何处理“自定义根目录 + portable 模式”？哪个分支会让 `baseDir` 变成 0？
- `NativeAppService` 的能力标记（`hasUpdater`/`hasIAP`/`canReadExternalDir`）依赖哪些环境变量或全局标记？
- `selectFiles` 在 Web 版为什么抛错？如果你要让 Web 端支持，最小替代方案是什么？

#### 第 27 课：Env Provider
- 覆盖模块：`apps/readest-app/src/context/EnvContext.tsx`、`apps/readest-app/src/components/Providers.tsx`。
- 任务：用 Svelte 的 context 或 store 组织 Env 注入，并保证 `AppService` 只在客户端初始化。
子任务清单：
1. 先理解概念（新手友好）：
   - EnvProvider 解决“在全局拿到 envConfig 与 appService”的问题。
   - `envConfig.getAppService()` 是异步的，并且会根据平台动态 import 实现。
   - Provider 还会放置一些“全局副作用”（如 i18n、主题、安全区、错误吞掉等）。
2. 代码清单（来自源码）：
   - `EnvContext.tsx`：`EnvContextType`、`EnvProvider`、`useEnv`、`envConfig.getAppService()`、`ResizeObserver loop` 错误拦截。
   - `Providers.tsx`：`useEnv()`、`loadDataTheme`、`initSystemThemeListener`、`useSafeAreaInsets`、`useBackgroundTexture`、`useEinkMode`、`useDefaultIconSize`、`getLocale`、`getDirFromUILanguage`、`i18n.on('languageChanged')`。
3. 逐步实现（建议顺序）：
   1) 在 `apps/br1/src/lib/context/env.ts` 创建 Svelte 版 `EnvContextType` 与 `setContext/getContext`。
   2) 新建 `EnvProvider.svelte`（或直接在 `+layout.svelte` 中实现）：`onMount` 调 `envConfig.getAppService()`，将结果写入 store。
   3) 加入 `ResizeObserver loop limit exceeded` 的全局错误拦截（记得 `onDestroy` 清理）。
   4) 为 `appService` 为空时提供占位 UI（避免子组件访问空值）。
   5) 先只把 `envConfig` 与 `appService` 暴露出来；其他副作用留到后续课程扩展。
4. 常见坑与验证提醒：
   - SvelteKit SSR 没有 `window`，所有副作用必须放到 `onMount`。
   - `getAppService()` 只能在浏览器调用，服务端调用会报错。
   - 需要保证 context 只初始化一次，避免多次触发 `appService.init()`。
   - 忘记清理全局 error 监听会造成多次注册与内存泄漏。
5. 最小验证（每步都能验证）：
   - 在 `+page.svelte` 输出 `appService?.appPlatform` 与 `envConfig` 的某个值。
   - 人为触发 `ResizeObserver loop limit exceeded`（如快速 resize），确认不会刷控制台。
   - 刷新页面确认 `appService` 只初始化一次。
验收问题（需结合源码回答）：
- `EnvProvider` 为什么把 `envConfig` 放在 `useState` 中？它的依赖意义是什么？
- `EnvProvider` 为什么用 `getAppService()` 而不是直接 `new WebAppService()`？
- `ResizeObserver loop limit exceeded` 的处理逻辑在哪里注册？为什么需要 `stopImmediatePropagation`？
- `Providers.tsx` 里为什么 `if (!appService) return;`？如果不做会导致什么后果？
- `loadDataTheme` 与 `initSystemThemeListener` 为什么要在 `appService` 准备好之后执行？
- `useSafeAreaInsets` 在 Providers 中只是调用一次，它的作用是什么？
- `handlerLanguageChanged` 如何同时更新 `document.lang` 与 RTL class？为什么要分离 RTL class？
- 你在 Svelte 中如何保证 “useEnv 只能在 Provider 内使用”？对应哪段逻辑？

#### 第 28 课：Auth Context
- 覆盖模块：`apps/readest-app/src/context/AuthContext.tsx`。
- 任务：迁移登录态与用户信息管理，让 Web 端的 token/用户状态与 Supabase 同步。
子任务清单：
1. 先理解概念（新手友好）：
   - AuthContext 负责保存 `token` 与 `user`，并与 Supabase session 同步。
   - Readest 在 Web 端直接用 `localStorage` 保存 token（`getAccessToken` 会读它）。
   - `onAuthStateChange` 是“同步真实登录态”的核心入口。
2. 代码清单（来自源码）：
   - `AuthContext.tsx`：`token`/`user` state、`login`/`logout`/`refresh`、`syncSession`、`supabase.auth.onAuthStateChange`。
   - `utils/supabase.ts`：`supabase` 客户端、`createSupabaseClient`。
   - `utils/access.ts`：`getAccessToken`（Web 直接读 `localStorage`）。
3. 逐步实现（建议顺序）：
   1) 在 `apps/br1/src/lib/stores/auth.ts` 定义 `token`/`user` 两个可写 store，初始化时从 `localStorage` 读取（需 `browser` 判断）。
   2) 实现 `syncSession(session)`：写入 `token`/`refresh_token`/`user`，并同步更新 store。
   3) 订阅 `supabase.auth.onAuthStateChange`，调用 `syncSession`；在 `onDestroy` 里取消订阅。
   4) 实现 `refresh()`：调用 `supabase.auth.refreshSession()`，失败则清空本地状态。
   5) 实现 `login()` 与 `logout()`：`login` 只更新本地；`logout` 调 `signOut` 并清空存储。
   6) 在页面上渲染用户信息占位（如 user.id、email），验证状态更新。
4. 常见坑与验证提醒：
   - SSR 环境无法访问 `localStorage`，初始化必须加浏览器判断。
   - JSON 解析失败时要 fallback 为 `null`，否则会崩。
   - `refreshSession` 失败时要清理本地 token，否则会让 API “以为已登录”。
   - `posthog.identify` 只能在浏览器调用，避免在 SSR 中触发。
   - Web 端 token 不落地会导致 `getAccessToken()` 返回 `null`，同步与存储都会失败。
5. 最小验证（每步都能验证）：
   - 进入页面打印 `token`/`user`，确认刷新后仍可读取。
   - 人为调用 `login()` 写入假数据，确认 UI 更新。
   - 调用 `logout()`，确认 `localStorage` 清空并回到未登录状态。
验收问题（需结合源码回答）：
- `AuthProvider` 初始化时为什么用 `useState(() => localStorage.getItem(...))` 这种写法？
- `syncSession` 里为什么要同时写入 `token`/`refresh_token`/`user`？缺少哪一项会影响什么？
- 为什么 `logout()` 先 `refreshSession` 再 `signOut`？这个顺序在源码中如何体现？
- `onAuthStateChange` 的回调参数是什么？它在登录/退出时各自返回什么值？
- `getAccessToken` 为何在 Web 端直接读 `localStorage`？如果你改为读 `supabase.auth.getSession()` 会遇到什么问题？
- `posthog.identify` 在哪里调用？它依赖哪个字段作为用户 id？
- `refresh()` 失败时如何清理状态？代码里走的是哪个分支？
- Svelte 中你如何保证这些逻辑只在浏览器执行？对应的 guard 是什么？

#### 第 29 课：Sync Context
- 覆盖模块：`apps/readest-app/src/context/SyncContext.tsx`。
- 任务：迁移同步上下文与状态，建立可复用的同步客户端与最小同步流程。
子任务清单：
1. 先理解概念（新手友好）：
   - `SyncContext` 只是“把 `SyncClient` 作为单例提供出去”。
   - 真正的同步流程在 `useSync.ts` 中完成（状态、时间戳、错误处理）。
   - 同步依赖 Auth 的 token（`getAccessToken`），所以要先完成第 28 课。
2. 代码清单（来自源码）：
   - `SyncContext.tsx`：`syncClient` 单例、`SyncProvider`、`useSyncContext`。
   - `libs/sync.ts`：`SyncClient`、`pullChanges`、`pushChanges`、`SyncType`/`SyncOp`。
   - `hooks/useSync.ts`：`computeMaxTimestamp`、`syncBooks/configs/notes`、`lastSyncedAt` 逻辑、`navigateToLogin`。
3. 逐步实现（建议顺序）：
   1) 在 `apps/br1/src/lib/context/sync.ts` 创建 `syncClient` 单例与 `SyncContextType`。
   2) 新建 `SyncProvider.svelte`（或在 `+layout.svelte` 里设置 context），仅暴露 `syncClient`。
   3) 创建 `apps/br1/src/lib/stores/sync.ts`，实现最小版 `createSync()`：
      - 状态：`syncing`、`syncError`、`syncResult`、`lastSyncedAtBooks/configs/notes`。
      - 方法：`pullChanges`、`pushChanges`。
   4) 参考 `useSync.ts` 加入 `computeMaxTimestamp` 与 `syncBooks`/`syncConfigs`/`syncNotes` 包装。
   5) 从 `settingsStore` 读取 `lastSyncedAt*`，并在成功后写回（先只覆盖 Books）。
   6) 在页面上加 2 个按钮：`pull books` / `push books`，显示 `syncError` 与 `syncing`。
4. 常见坑与验证提醒：
   - `SyncClient.pullChanges` 没 token 会抛 `Not authenticated`，需要在 UI 层展示提示。
   - `lastSyncedAt` 需要减去 1 天避免丢数据，逻辑在 `useSync.ts`。
   - React 中用 `useSettingsStore.getState()` 规避闭包；Svelte 里要用 `get()` 取最新值。
   - `syncResult` 的 `null` 与 `[]` 含义不同：`null` 表示未同步。
   - 同步时不要在 SSR 运行，否则会触发 `localStorage` 访问错误。
5. 最小验证（每步都能验证）：
   - 未登录时点 `pull books`，应显示 `Not authenticated` 的错误文案。
   - 设置 mock token 后调用 `pullChanges`，观察请求 URL 拼接是否正确。
   - `syncing` 在请求前后是否正确切换。
验收问题（需结合源码回答）：
- `SyncContext` 为什么把 `SyncClient` 放成模块级单例？如果每次渲染都 `new` 会怎样？
- `pullChanges` URL 中 `since/type/book/meta_hash` 如何拼接？它们分别代表什么？
- `computeMaxTimestamp` 为什么同时检查 `updated_at` 与 `deleted_at`？哪个字段优先？
- 为什么 `lastSyncedAt` 初始化会减去一天？源码里用的是 `ONE_DAY_IN_MS`，原因是什么？
- `useSync.ts` 里为什么在 `since <= 1000` 且无记录时直接 `setLastSyncedAt(now)`？
- `syncBooks` 的 `op` 为 `push`/`pull`/`both` 时，分别走哪些分支？
- 当 `Not authenticated` 且 `keepLogin=true` 时，为什么要 `navigateToLogin`？
- `syncResult` 里的 `books/configs/notes` 为什么先存 DB 结构，再由 `transformBookFromDB` 转换？
- `SyncClient` 获取 token 的路径是什么？为什么 Web 端直接读 `localStorage`？
- 在 Svelte 实现中，如何保证 `settingsStore` 写回不会丢最新值？

#### 第 30 课：平台服务补全
- 覆盖模块：`apps/readest-app/src/services/nativeAppService.ts`。
- 任务：补齐 Tauri 平台能力，完成 NativeAppService 与 FileSystem 的核心实现。
子任务清单：
1. 先理解概念（新手友好）：
   - NativeAppService 是“桌面/移动端平台能力的门面”。
   - FileSystem 把“路径 + BaseDir”映射为可读写的真实路径。
   - `getPathResolver` 解决“自定义根目录 + 便携模式 + 系统目录”的组合问题。
2. 代码清单（来自源码）：
   - 路径与文件系统：`getPathResolver`、`nativeFileSystem.resolvePath/getPrefix/getURL/getBlobURL/openFile/copyFile/readFile/writeFile/readDir/exists/stats`。
   - 平台标记：`isMobile/isDesktop/isAppDataSandbox/isAndroidApp/isIOSApp/isMacOSApp/isLinuxApp/isAppImage/isEink` 等。
   - 初始化流程：`init()`、`runMigrations()`、`setCustomRootDir()`、`migrate20251029()`。
   - 交互能力：`selectDirectory`、`selectFiles`、`saveFile`、`ask`。
   - 依赖：`@tauri-apps/plugin-fs`、`@tauri-apps/plugin-dialog`、`@tauri-apps/plugin-os`、`@tauri-apps/api/path`、`utils/bridge`、`utils/file`、`utils/files`、`utils/misc`。
3. 逐步实现（建议顺序）：
   1) 先实现 `getPathResolver`：覆盖 `Settings/Data/Books/Fonts/Images/Log/Cache/Temp/None`。
   2) 实现 `nativeFileSystem.getPrefix/resolvePath`，确认 `baseDir=0` 代表绝对路径。
   3) 实现 `openFile`：处理 URL / content URI / file URI / Android 远程文件的分支。
   4) 完成 `readFile/writeFile/copyFile/removeFile/createDir/removeDir/exists/stats`。
   5) 在 `readDir` 中优先调用 Rust `invoke('read_dir')`，失败再走 JS 递归。
   6) 实现 `NativeAppService` 的平台标记，接入 `NEXT_PUBLIC_DIST_CHANNEL` 与全局标记。
   7) 实现 `init()`：读取可执行目录、便携模式检测、`customRootDir` 处理、iOS 区域判断。
   8) 实现 `selectDirectory/selectFiles/saveFile/ask`，并在 UI 上做最小调用验证。
4. 常见坑与验证提醒：
   - `writeFile` 用于大文件会阻塞 UI，代码里有明确注释。
   - Android WebView 下 `RemoteFile` 有 range request bug，必须走 `NativeFile`。
   - content URI 在 Android/iOS 需要复制到 Cache，否则无权限访问。
   - 便携模式会把 `Settings`/`Data` 映射到可执行目录，路径拼接要小心。
   - `hasUpdater` 同时依赖环境变量与 `window.__READEST_UPDATER_DISABLED`。
   - `read_dir` 的 Rust 命令不存在时要能自动 fallback。
5. 最小验证（每步都能验证）：
   - 在 Tauri dev 里调用 `selectFiles` 选一个文件并打印路径。
   - 用 `writeFile` 写入一个小 JSON，再 `readFile` 读取确认一致。
   - 打印 `getPrefix('Books')` 与 `resolveFilePath('', 'Books')` 看是否一致。
   - 设置 `customRootDir` 后确认 `localBooksDir` 跟随变化。
验收问题（需结合源码回答）：
- `getPathResolver` 在 `Settings` 与 `Books` 上的 `baseDir` 分别是什么？便携模式下如何改变？
- `customRootDir` 开启时，`resolvePath` 如何让 `baseDir` 变成 0？为什么要这样做？
- `openFile` 为什么对 `content://` 与 `file://` URI 做不同分支？`copyURIToPath` 的角色是什么？
- Android 为何绕过 `RemoteFile`？注释里提到的具体问题是什么？
- `readDir` 什么时候走 `invoke('read_dir')`？失败后 fallback 的策略是什么？
- `hasUpdater` 的判断条件由哪些环境变量或全局标记组成？
- `init()` 里便携模式是如何检测的？涉及哪些文件或环境变量？
- `setCustomRootDir()` 为什么要 `prepareBooksDir()`？如果不做会发生什么？
- `migrate20251029()` 复制了哪些目录？为什么要删除旧目录？
- iOS 上 `saveFile()` 为什么走 `shareFile()` 而不是 `saveDialog()`？

#### 第 31 课：元数据服务
- 覆盖模块：`apps/readest-app/src/services/metadata/*`。
- 任务：迁移元数据搜索与提供者，并建立“客户端请求 -> 服务端聚合”的最小链路。
子任务清单：
1. 先理解概念（新手友好）：
   - 元数据用于补全书名、作者、封面、出版信息。
   - Provider 负责调用外部 API，MetadataService 负责聚合与排序。
   - Google Books 需要 API key，必须在服务端使用，避免暴露。
2. 代码清单（来自源码）：
   - 类型与接口：`metadata/types.ts`（`Metadata`/`SearchRequest`/`MetadataResult`/`MetadataProvider`）。
   - Provider 基类：`metadata/providers/base.ts`（ISBN 校验、相似度、置信度）。
   - OpenLibrary：`metadata/providers/openlibrary.ts`。
   - GoogleBooks：`metadata/providers/googlebooks.ts`。
   - 服务聚合：`metadata/service.ts`。
   - API 路由：`app/api/metadata/search/route.ts`。
   - 客户端请求：`libs/metadata.ts`。
3. 逐步实现（建议顺序）：
   1) 先实现 `Metadata` 与 `SearchRequest` 类型，确保字段与 BookMetadata 对齐。
   2) 实现 `BaseMetadataProvider`：`search()` 分流 ISBN/Title，`calculateConfidence()` 做排序依据。
   3) 实现 `OpenLibraryProvider`：ISBN 走 `/api/books`，标题走 `/search.json`，并做语言过滤。
   4) 实现 `GoogleBooksProvider`：API key 列表、随机 key、错误码处理（429/403）。
   5) 实现 `MetadataService`：并发调用所有 providers，用 `Promise.allSettled` 聚合。
   6) 在 SvelteKit 写 `src/routes/api/metadata/search/+server.ts` 复制 Next API 的验证逻辑。
   7) 写 `searchMetadata()` 客户端函数，通过 `/api/metadata/search` 请求。
   8) 在书库详情页做一个“搜索元数据”按钮，展示前 3 条结果。
4. 常见坑与验证提醒：
   - ISBN 必须是 10 或 13 位数字，需先去掉 `-` 与空格。
   - OpenLibrary 返回 `cover_i` 与 `description` 的格式很不统一，需要兼容。
   - GoogleBooks API key 不能为空，否则 provider 构造会抛错。
   - Provider 失败不能影响整体结果，必须隔离错误。
   - `MetadataService` 排序依赖 `confidence`，否则结果顺序不稳定。
   - API 路由必须鉴权，否则会泄露 API key 或被滥用。
5. 最小验证（每步都能验证）：
   - 输入 ISBN（如 978 开头）返回至少 1 条结果。
   - 输入标题 + 作者返回多条结果并按置信度排序。
   - 用无效 ISBN 触发 400 并显示错误信息。
   - 让一个 provider 抛错，确认另一个 provider 仍返回结果。
验收问题（需结合源码回答）：
- `BaseMetadataProvider.search()` 如何判断走 ISBN 还是标题搜索？`hasISBN/hasTitle` 的判断条件是什么？
- `calculateConfidence()` 为什么对封面缺失做减分？标题与作者相似度是如何计算的？
- `OpenLibraryProvider` 的 ISBN 搜索与标题搜索分别调用哪个接口？返回数据结构有何差异？
- `formatBookData()` 中使用了哪个字段作为封面？它与 `Metadata.coverImageUrl` 是否一致？
- `GoogleBooksProvider` 如何选择 API key？遇到 429 或 403 会抛出什么错误？
- `extractISBN()` 为什么优先选 ISBN_13？没有时如何 fallback？
- `MetadataService.search()` 为什么用 `Promise.allSettled` 而不是 `Promise.all`？
- API 路由如何验证请求体？如果既没有 title 也没有 isbn 会返回什么？
- `validateUserAndToken()` 失败时返回什么状态码？为什么要阻止匿名访问？
- 客户端 `searchMetadata()` 为什么通过 `/api/metadata/search` 而不是直接访问 Google/OpenLibrary？

#### 第 32 课：Transform 服务
- 覆盖模块：`apps/readest-app/src/services/transformService.ts`、`src/services/transformers/*`。
- 任务：建立内容转换管线入口，把 HTML/CSS 预处理接入阅读渲染流程。
子任务清单：
1. 先理解概念（新手友好）：
   - Transform 是“内容入渲染前的清洗与修正”，解决排版、语言、标点、脚注等问题。
   - `transformContent()` 根据 `ctx.transformers` 顺序执行多个转换器。
   - 该流程通常在 Reader 的 `doc transform` 阶段触发。
2. 代码清单（来自源码）：
   - `transformService.ts`：`transformContent()`。
   - 变换器注册：`transformers/index.ts`。
   - 单个变换器：`punctuation`、`footnote`、`language`、`style`、`whitespace`、`sanitizer`、`simplecc`、`proofread`。
   - 依赖：`utils/style.transformStylesheet`、`utils/lang`、`utils/simplecc`、`DOMPurify`、`foliate-js/epubcfi.js`。
3. 逐步实现（建议顺序）：
   1) 先迁移 `Transformer`/`TransformContext` 类型，建立 `availableTransformers` 注册表。
   2) 实现 `transformContent()`：根据名字查找 transformer，按顺序执行并捕获错误。
   3) 先启用 `footnote` + `whitespace` + `sanitizer`，确保基础清洗可用。
   4) 加入 `language` 与 `punctuation`，让 `lang/dir` 与中文标点逻辑生效。
   5) 加入 `styleTransformer`，用 `transformStylesheet()` 处理 `<style>` 内容。
   6) 加入 `simpleccTransformer`（需加载 wasm），实现繁简转换。
   7) 最后接入 `proofreadTransformer`（基于规则替换与 CFI）。
   8) 在阅读渲染前调用 `transformContent()`，顺序参考 `FoliateViewer.tsx`。
4. 常见坑与验证提醒：
   - DOMParser/DOMPurify 在 SSR 不可用，必须只在浏览器执行。
   - `sanitizer` 会生成完整 XML 文档并注入 DOCTYPE，重复注入会出错。
   - `simplecc` 需要 wasm 资源路径 `/vendor/simplecc/simplecc_wasm_bg.wasm`。
   - `languageTransformer` 会覆盖 `<html>` 的 `lang/xml:lang`，需避免误判。
   - `punctuationTransformer` 与 `simplecc` 的顺序会影响结果，需保持一致。
   - `proofreadTransformer` 使用 `useSettingsStore.getState()` 读取规则，Svelte 中需替换为 `get()`。
5. 最小验证（每步都能验证）：
   - 输入含 `<script>` 的 HTML，`sanitizer` 后应移除脚本。
   - 设置 `overrideLayout=true`，`whitespace` 应清理 `&nbsp;`。
   - 设定 `vertical=true`，`punctuation` 应转换引号形态。
   - 传入 `primaryLanguage`，`language` 应写入 `lang`/`dir`。
   - 开启 `simplecc`，繁简转换应生效。
验收问题（需结合源码回答）：
- `transformContent()` 如何从 `ctx.transformers` 解析出实际 transformer？找不到时会怎样？
- 为什么 `transformContent()` 逐个串行执行而不是并行？这与“上一步输出是下一步输入”有什么关系？
- `footnoteTransformer` 的正则匹配了哪些 `epub:type` 值？它修改了什么 class？
- `languageTransformer` 在 `<html>` 已有 `lang` 时如何判断是否替换？`dir="rtl"` 从何而来？
- `punctuationTransformer` 中 `convertChineseVariant` 与 `reversePunctuationTransform` 的关系是什么？
- `whitespaceTransformer` 为什么只在 `overrideLayout` 为 true 时处理？
- `sanitizerTransformer` 的 `ALLOWED_URI_REGEXP` 与 `ADD_ATTR` 白名单包含哪些特殊属性？目的是什么？
- `styleTransformer` 为什么要调用 `transformStylesheet()`？它会处理哪些 CSS 关键点（如 `page-break-after` 与 `vw/vh`）？
- `simpleccTransformer` 是如何遍历 DOM 文本节点的？为什么要跳过 `script/style`？
- `proofreadTransformer` 如何合并 `globalRules` 与 `bookRules`？`selection` 范围如何靠 CFI 定位？
- 在 `FoliateViewer.tsx` 里实际调用 `transformContent()` 的 transformer 顺序是什么？顺序为什么重要？

### 阶段 E：状态管理体系（第 33-40 课）
#### 第 33 课：Settings Store
- 覆盖模块：`apps/readest-app/src/store/settingsStore.ts`。
- 任务：迁移设置与持久化，把“全局设置 + UI 状态 + 语言应用”统一起来。
子任务清单：
1. 先理解概念（新手友好）：
   - `settingsStore` 管的是“系统设置数据 + 设置面板 UI 状态”。
   - `SystemSettings` 很大，但 store 只负责读写，不负责默认值构造（默认值在 AppService）。
   - `applyUILanguage` 会联动 i18n 与日期库（dayjs）。
2. 代码清单（来自源码）：
   - 状态：`settings`、`settingsDialogBookKey`、`isSettingsDialogOpen`、`isSettingsGlobal`、`fontPanelView`。
   - 方法：`setSettings`、`saveSettings`、`setSettingsDialogBookKey`、`setSettingsDialogOpen`、`setSettingsGlobal`、`setFontPanelView`、`applyUILanguage`。
   - 依赖：`EnvConfigType`、`i18n`、`initDayjs`。
3. 逐步实现（建议顺序）：
   1) 在 `apps/br1/src/lib/stores/settings.ts` 定义 Svelte store 结构（`settings` + UI 状态）。
   2) 实现 `setSettings()` 与 `saveSettings()`：`saveSettings` 通过 `envConfig.getAppService().saveSettings`。
   3) 实现 UI 状态方法（dialog open/global 切换、`fontPanelView`）。
   4) 实现 `applyUILanguage`：调用 `i18n.changeLanguage` + `initDayjs`，并处理 `navigator.language` 兜底。
   5) 在 `+layout.svelte` 初始化：`appService.loadSettings()` -> `setSettings()`。
   6) 在设置页做 1~2 个最小字段（如 `libraryViewMode`/`keepLogin`）并验证写回。
4. 常见坑与验证提醒：
   - `settings` 初始值是空对象，必须等 `loadSettings()` 后再渲染设置 UI。
   - `applyUILanguage` 依赖 `navigator.language`，只能在浏览器调用。
   - `saveSettings` 是异步的，UI 要避免“点一次连发多次”。
   - 多处修改 `settings` 时要注意浅拷贝，避免意外共享引用。
5. 最小验证（每步都能验证）：
   - `loadSettings()` 后把 `settings.version` 打印出来确认读取成功。
   - 在 UI 改一个设置并调用 `saveSettings()`，刷新页面检查是否持久化。
   - 切换 UI 语言后确认界面文本与 dayjs 格式变化。
验收问题（需结合源码回答）：
- `saveSettings` 为什么要通过 `envConfig.getAppService()` 而不是直接写文件？
- `settingsStore` 为什么还保存 `settingsDialogBookKey`？这个字段在 UI 上解决什么问题？
- `fontPanelView` 的取值有哪些？它会影响哪块设置面板？
- `applyUILanguage` 使用的 `locale` 取值逻辑是什么？`navigator.language` 什么时候被用到？
- 为什么 `settings` 在 store 里不是默认值，而是空对象？默认值在哪里生成？
- 你如何确保 `saveSettings()` 不在 SSR 中调用？需要加什么 guard？

#### 第 34 课：Theme Store
- 覆盖模块：`apps/readest-app/src/store/themeStore.ts`。
- 任务：迁移主题与系统 UI 状态，保证 data-theme、系统暗色、圆角窗口与安全区的联动。
子任务清单：
1. 先理解概念（新手友好）：
   - `themeMode` 控制 dark/light/auto，`themeColor` 控制配色主题。
   - `themeCode` 是根据当前主题与系统暗色状态计算出的实际颜色集。
   - `loadDataTheme()` 用于“首屏加载时立刻设置 data-theme”，避免闪烁。
2. 代码清单（来自源码）：
   - 状态：`themeMode`、`themeColor`、`systemIsDarkMode`、`isDarkMode`、`themeCode`。
   - UI 状态：`systemUIVisible`、`statusBarHeight`、`systemUIAlwaysHidden`、`safeAreaInsets`、`isRoundedWindow`。
   - 方法：`setThemeMode`、`setThemeColor`、`updateAppTheme`、`saveCustomTheme`、`handleSystemThemeChange`、`updateSafeAreaInsets`。
   - 辅助：`getInitialThemeMode`、`getInitialThemeColor`、`loadDataTheme`、`initSystemThemeListener`。
   - 依赖：`getThemeCode`、`themes/customThemes`、`getSystemColorScheme`（iOS）、`getCurrentWindow`（Linux）。
3. 逐步实现（建议顺序）：
   1) 建 `apps/br1/src/lib/stores/theme.ts`：实现 `themeMode/themeColor/isDarkMode/themeCode`。
   2) 接入 `localStorage`：初始化 `themeMode/themeColor`，更新时写回。
   3) 实现 `setThemeMode`/`setThemeColor`：更新 `data-theme` 属性 + `themeCode`。
   4) 实现 `loadDataTheme()`：在 `+layout.svelte` 的 `onMount` 调用。
   5) 实现 `initSystemThemeListener()`：matchMedia 监听 + iOS `getSystemColorScheme`。
   6) 增加 `safeAreaInsets` 与 `isRoundedWindow` 状态（先用假数据再接真实）。
   7) 添加 `saveCustomTheme()`：写入 `settings.globalReadSettings.customThemes` 并持久化。
4. 常见坑与验证提醒：
   - `localStorage` 与 `document` 在 SSR 不存在，必须 guard。
   - `setThemeMode`/`setThemeColor` 要同时更新 `data-theme` 与 `themeCode`。
   - `updateAppTheme` 只在 Web 端更新 `<meta name="theme-color">`。
   - `isRoundedWindow` 只在 Linux + Tauri 窗口尺寸变化时更新。
   - 自定义主题要落地到 `settings` 与 `localStorage` 两处。
5. 最小验证（每步都能验证）：
   - 在浏览器切换 `themeMode=dark/auto`，观察 `data-theme` 变化。
   - 切换 `themeColor` 后刷新页面，确认主题仍保持。
   - 修改系统暗色设置，确认 `isDarkMode` 自动更新。
   - 手动设置 `safeAreaInsets` 并在 UI 上显示。
验收问题（需结合源码回答）：
- `getInitialThemeMode`/`getInitialThemeColor` 如何从 `localStorage` 读取？`__READEST_IS_EINK` 有什么影响？
- `setThemeMode` 为什么要同时更新 `data-theme` 与 `themeCode`？没有 `themeCode` 会影响什么？
- `updateAppTheme` 在 Web 下改的是哪个 meta 标签？颜色取自哪个对象？
- `saveCustomTheme` 为什么要写入 `settings.globalReadSettings.customThemes`？还写了哪一个本地缓存？
- `initSystemThemeListener` 在 iOS 为什么调用 `getSystemColorScheme`？在其他平台走什么分支？
- `updateWindowTheme` 只在 Linux 执行的原因是什么？它怎么判断圆角窗口？
- `loadDataTheme` 需要在什么时候执行？不执行会出现什么 UI 问题？
- `systemIsDarkMode` 与 `isDarkMode` 有何区别？`auto` 模式下如何计算？

#### 第 35 课：Library Store
- 覆盖模块：`apps/readest-app/src/store/libraryStore.ts`。
- 任务：迁移书库数据结构、分组逻辑与选择状态，完成可用的书库状态管理。
子任务清单：
1. 先理解概念（新手友好）：
   - `library` 包含所有书（含已删除），`getVisibleLibrary()` 过滤后用于 UI。
   - `groups` 是“分组路径 -> id”的索引，用于书架/分组视图。
   - `selectedBooks` 是 Set，支持多选批量操作。
2. 代码清单（来自源码）：
   - 状态：`library`、`currentBookshelf`、`groups`、`selectedBooks`、`isSyncing`、`syncProgress`。
   - 方法：`setLibrary`、`updateBook`、`updateBooks`、`refreshGroups`、`addGroup`、`getGroups`、`getGroupId`、`getGroupName`、`getGroupsByParent`。
   - 依赖：`BOOK_UNGROUPED_NAME`、`md5Fingerprint`、`isTauriAppPlatform`。
3. 逐步实现（建议顺序）：
   1) 定义 Svelte store：`library` + `currentBookshelf` + `selectedBooks`。
   2) 实现 `setLibrary()` 与 `getVisibleLibrary()`，过滤 `deletedAt`。
   3) 实现 `updateBook/updateBooks`：调用 `appService.saveLibraryBooks()`。
   4) 实现 `refreshGroups()`：从 `book.groupName` 生成多级分组路径。
   5) 实现分组工具：`addGroup`、`getGroups`、`getGroupId`、`getParentPath`、`getGroupsByParent`。
   6) 实现 `selectedBooks` 操作：`setSelectedBooks/getSelectedBooks/toggleSelectedBook`。
   7) UI 中展示：书库列表 + 分组树 + 选中状态。
4. 常见坑与验证提醒：
   - `refreshGroups` 要跳过 `BOOK_UNGROUPED_NAME` 和 `deletedAt` 的书。
   - `updateBooks` 用 Map 合并避免重复，注意后者覆盖前者。
   - `selectedBooks` 用 Set，更新时要重新 new 才能触发响应。
   - `getGroupId` 会对不存在的路径也返回 md5，需确保一致性。
5. 最小验证（每步都能验证）：
   - 添加 2 本书并设置 `groupName` 为 `A/B`，检查 `groups` 生成 `A` 与 `A/B`。
   - 删除一本书（设置 `deletedAt`），`getVisibleLibrary` 应不显示它。
   - 切换选中状态，UI 能显示数量变化。
验收问题（需结合源码回答）：
- `library` 为什么允许包含删除的书？`getVisibleLibrary` 过滤了什么？
- `updateBooks` 使用 `new Map([...library, ...books])` 合并的规则是什么？为什么这么做？
- `refreshGroups` 如何解析 `A/B/C` 这种路径？循环里 `nextSlashIndex` 起到什么作用？
- `BOOK_UNGROUPED_NAME` 的含义是什么？为什么要跳过它？
- `selectedBooks` 为什么用 `Set` 而不是数组？`toggleSelectedBook` 如何保证幂等？
- `getParentPath` 对没有 `/` 的路径返回什么？这对 UI 分组有什么影响？
- `checkOpenWithBooks`/`checkLastOpenBooks` 为什么只在 Tauri 平台默认开启？

#### 第 36 课：Reader Store
- 覆盖模块：`apps/readest-app/src/store/readerStore.ts`。
- 任务：迁移阅读视图状态与进度管理，打通“加载书籍 -> viewState -> 进度保存”的全链路。
子任务清单：
1. 先理解概念（新手友好）：
   - `viewStates` 是以 `viewKey` 为索引的状态容器，可同时存在多个视图（并行视图/分屏）。
   - `viewSettings` 需要合并全局设置与书籍配置，并在主视图写回配置。
   - `setProgress` 同时更新 reader state 与 library 中的书籍进度。
2. 代码清单（来自源码）：
   - 结构：`ViewState`、`ReaderStore`、`viewStates`、`bookKeys`。
   - 初始化：`initViewState`、`clearViewState`、`recreateViewer`。
   - 状态更新：`setView`、`setViewSettings`、`setProgress`、`setBookmarkRibbonVisibility`、`setTTSEnabled`、`setIsSyncing`、`setGridInsets`。
   - 依赖：`DocumentLoader`、`updateToc`、`getMetadataHash`、`useBookDataStore`、`useLibraryStore`、`useSettingsStore`、`FIXED_LAYOUT_FORMATS`、`SUPPORTED_LANGNAMES`。
3. 逐步实现（建议顺序）：
   1) 定义 `ViewState` 类型与 `viewStates` store，先实现 `setView/getView/getViews`。
   2) 实现 `initViewState()`：加载书籍、`DocumentLoader.open()`、读取 `BookConfig` 与 `settings`。
   3) 接入 `updateToc()`，并根据 `sortedTOC`/`convertChineseVariant` 更新目录。
   4) 修正元数据：标题为空时用文件名、语言名纠错、`primaryLanguage` 与 `metaHash`。
   5) 合并 `globalViewSettings + config.viewSettings`，写入 `viewStates[key].viewSettings`。
   6) 实现 `setViewSettings()`：主视图更新 `bookData.config.viewSettings`。
   7) 实现 `setProgress()`：计算页码、更新 library、写回 book config。
   8) 实现 `recreateViewer()`：重新 init 后更新 `viewerKey` 触发重建。
4. 常见坑与验证提醒：
   - `initViewState` 失败时要重置 `viewStates[key]`，避免 UI 卡死。
   - `viewKey` 结构为 `${bookId}-${...}`，`id` 必须从 `key.split('-')[0]` 得到。
   - `setViewSettings` 只在 `isPrimary` 时写回配置，副视图不要覆盖主配置。
   - `setProgress` 中 `pagePressInfo` 在固定布局与滚动布局不同。
   - `metaHash` 计算依赖元数据完整性，错误会影响同步。
5. 最小验证（每步都能验证）：
   - 打开一本书，`initViewState` 后 `viewSettings` 非空。
   - 改变阅读设置（如字号），主视图写回配置文件。
   - 翻页后 `progress` 更新，同时书库里的该书 `updatedAt` 改变。
   - 调用 `recreateViewer()`，`viewerKey` 变化并触发重新渲染。
验收问题（需结合源码回答）：
- `initViewState` 初始化时为什么先写一个 “loading=true 的空 viewState”？避免了什么问题？
- `updateToc` 需要哪些参数？`sortedTOC` 与 `convertChineseVariant` 从哪来？
- 为什么要修正 `bookDoc.metadata.language`？`SUPPORTED_LANGNAMES` 的作用是什么？
- `metaHash` 为什么要在这里生成？注释里为什么说暂时不安全？
- `viewSettings` 为什么要用 `{...globalViewSettings, ...configViewSettings}` 合并？覆盖顺序的意义是什么？
- `setViewSettings` 为什么只在 `isPrimary` 时更新 `bookData.config`？
- `setProgress` 为什么要更新 library 里的 `book.updatedAt`？这个字段用于什么排序？
- `pagePressInfo` 在固定布局与普通布局下分别取 `section` 还是 `pageinfo`？对应代码逻辑是什么？
- `viewerKey` 的用途是什么？`recreateViewer` 为什么要改它？

#### 第 37 课：BookData Store
- 覆盖模块：`apps/readest-app/src/store/bookDataStore.ts`。
- 任务：迁移书籍配置与批注数据，打通“BookData <-> 配置文件 <-> 书库列表”的一致性。
子任务清单：
1. 先理解概念（新手友好）：
   - `BookData` 保存同一本书在多个视图间共享的数据（book/file/config/bookDoc）。
   - `bookKey` 是 `${bookId}-${viewId}`，所以需要 `split('-')[0]` 拿到书籍 id。
   - `saveConfig()` 不只保存配置，还会更新书库排序与书籍进度。
2. 代码清单（来自源码）：
   - 数据结构：`BookData`、`booksData`、`getBookData`、`clearBookData`。
   - 配置读写：`getConfig`、`setConfig`、`saveConfig`。
   - 批注更新：`updateBooknotes`（去重 + 更新 `updatedAt`）。
   - 依赖：`EnvConfigType`、`SystemSettings`、`useLibraryStore`。
3. 逐步实现（建议顺序）：
   1) 建 `apps/br1/src/lib/stores/bookData.ts`：实现 `booksData` Map 与 `getBookData/clearBookData`。
   2) 实现 `getConfig`：允许 `key` 为 null，并返回 `null`。
   3) 实现 `setConfig`：支持 partial 更新，注意 `config` 为空要警告。
   4) 实现 `saveConfig`：更新书库顺序（移动到最前），同步 `progress/updatedAt/downloadedAt`。
   5) 调 `appService.saveBookConfig()` 与 `saveLibraryBooks()`，保证磁盘与内存一致。
   6) 实现 `updateBooknotes`：以 `${id}-${type}-${cfi}` 去重，并返回更新后的 config。
4. 常见坑与验证提醒：
   - 不能直接用 `bookKey` 作为 id，必须 `split('-')[0]`。
   - `setConfig` 里直接 `Object.assign` 会改变引用，Svelte 里需确保 store 更新触发。
   - `saveConfig` 要更新 `library` 的顺序，否则书库排序不会更新。
   - `updateBooknotes` 去重必须包含 `cfi`，否则会误合并不同位置。
5. 最小验证（每步都能验证）：
   - 更新一次 `setConfig`，观察 UI 里的 `viewSettings` 有变化。
   - 调 `saveConfig` 后刷新页面，配置仍生效。
   - 添加两个相同 `id/type` 但不同 `cfi` 的笔记，确认不会被合并。
验收问题（需结合源码回答）：
- `getBookData` 为什么对 `keyOrId` 做 `split('-')[0]`？这和 `viewKey` 设计有什么关系？
- `setConfig` 在找不到 config 时为什么只 `console.warn`？如果直接 throw 会影响哪些流程？
- `saveConfig` 为什么要 `library.splice` 再 `unshift`？这对书库排序有什么效果？
- `saveConfig` 为什么要更新 `book.downloadedAt`？哪些场景下它可能是空？
- `updateBooknotes` 用 `Map` 去重的 key 由哪三部分组成？为什么不能只用 `id`？
- `saveBookConfig` 与 `saveLibraryBooks` 的调用顺序是否重要？理由是什么？
- `updateBooknotes` 返回 `updatedConfig` 的用途可能是什么？在 UI 上如何利用？

#### 第 38 课：Sidebar/Notebook Store
- 覆盖模块：`apps/readest-app/src/store/sidebarStore.ts`、`notebookStore.ts`。
- 任务：迁移侧栏与笔记本状态，完成“搜索/笔记导航 + 笔记面板”的状态管理。
子任务清单：
1. 先理解概念（新手友好）：
   - `sidebarStore` 是“每本书一个搜索/笔记导航状态”的管理器。
   - `notebookStore` 是“笔记面板 UI 状态 + 草稿状态”的管理器。
   - 两者都与当前书籍的 `bookKey` 强相关。
2. 代码清单（来自源码）：
   - `sidebarStore.ts`：`SearchNavState`、`BooknotesNavState`、`defaultSearchNavState`、`defaultBooknotesNavState`、`setSearchTerm`、`setSearchResults`、`setSearchResultIndex`、`setSearchProgress`、`clearSearch`。
   - `notebookStore.ts`：`NotebookTab`、`notebookActiveTab`、`notebookNewAnnotation`、`notebookEditAnnotation`、`saveNotebookAnnotationDraft/getNotebookAnnotationDraft`。
3. 逐步实现（建议顺序）：
   1) 建 `apps/br1/src/lib/stores/sidebar.ts`，先实现 `isSideBarVisible/isSideBarPinned/sideBarWidth`。
   2) 实现 per-book 的 `searchNavStates` 与 `booknotesNavStates`，并提供默认状态兜底。
   3) 加入 `searchStatuses` 与 `clearSearch`，确保停止搜索后状态可被识别。
   4) 建 `apps/br1/src/lib/stores/notebook.ts`，实现 `notebookActiveTab` 与 `notebookNewAnnotation`。
   5) 加入草稿存储 `notebookAnnotationDrafts`，在编辑时保存草稿。
   6) 在 UI 中加入：侧栏开关、搜索框、笔记面板切换按钮。
4. 常见坑与验证提醒：
   - `getSearchNavState`/`getBooknotesNavState` 必须返回默认值，否则 UI 会报空。
   - `clearSearch` 会把 `searchStatus` 设为 `terminated`，避免后台搜索继续写入。
   - `searchProgress` 语义是 0~1，默认 1 表示“已完成/未开始”。
   - 草稿 key 的选择要稳定（通常用 noteId 或 `${bookKey}-${noteId}`）。
5. 最小验证（每步都能验证）：
   - 切换书籍时，搜索状态不会相互污染。
   - `clearSearch` 后进度归 1、结果为空、状态为 `terminated`。
   - 在笔记编辑中输入内容，切换面板再回来草稿仍在。
验收问题（需结合源码回答）：
- `defaultSearchNavState` 中 `searchProgress` 为什么是 1 而不是 0？
- `clearSearch` 除了重置结果外，还修改了哪个状态？为什么要这么做？
- `searchNavStates` 的 key 是什么？如果使用 `bookId` 而不是 `bookKey` 会有何差异？
- `booknotesNavStates` 的 `activeBooknoteType` 代表什么？它如何影响筛选？
- `notebookNewAnnotation` 与 `notebookEditAnnotation` 的职责有何不同？
- `saveNotebookAnnotationDraft` 是如何保存草稿的？与 UI 的“未保存提示”如何联动？
- `toggleSideBarPin` 和 `setSideBarPin` 的使用场景差异是什么？

#### 第 39 课：Device/Font/Texture Store
- 覆盖模块：`apps/readest-app/src/store/deviceStore.ts`、`customFontStore.ts`、`customTextureStore.ts`。
- 任务：迁移设备控制与自定义资源管理，完成“按键拦截 + 字体/纹理加载与持久化”。
子任务清单：
1. 先理解概念（新手友好）：
   - `deviceStore` 处理硬件按键拦截与屏幕亮度。
   - `customFontStore`/`customTextureStore` 管理资源列表与 Blob URL 生命周期。
   - 字体/纹理最终写回 `settings`，并在阅读时挂载到 DOM。
2. 代码清单（来自源码）：
   - `deviceStore.ts`：`acquire/releaseVolumeKeyInterception`、`acquire/releaseBackKeyInterception`、`listenToNativeTouchEvents`、`getScreenBrightness`、`setScreenBrightness`。
   - `customFontStore.ts`：`addFont/removeFont/loadFont/loadAllFonts/saveCustomFonts`、`getFontFamilies`、`loadCustomFonts`。
   - `customTextureStore.ts`：`addTexture/removeTexture/loadTexture/applyTexture/saveCustomTextures`、`PREDEFINED_TEXTURES`。
3. 逐步实现（建议顺序）：
   1) 建 `deviceStore`，实现按键拦截计数器，确保多处申请不会相互覆盖。
   2) 实现 `listenToNativeTouchEvents`，把 native touch 事件派发到 `eventDispatcher`。
   3) 实现屏幕亮度读写（先在 Web 里做 no-op 或 mock）。
   4) 实现 `customFontStore`：`addFont` -> `loadFont` -> 生成 `blobUrl`。
   5) 实现 `customTextureStore`：`addTexture` -> `loadTexture` -> `applyTexture`。
   6) 将字体/纹理写回 `settings.customFonts/customTextures`。
4. 常见坑与验证提醒：
   - `acquire/release` 采用计数器，若直接 boolean 会导致冲突。
   - `window.onNativeKeyDown` 只应在 Tauri 中注册，Web 端可跳过。
   - Blob URL 必须在删除/卸载/卸载页面时 revoke，否则内存泄漏。
   - `loadFont/loadTexture` 失败要保留 `error` 并避免重复加载。
   - `applyTexture` 遇到 `id=none` 必须 unmount。
5. 最小验证（每步都能验证）：
   - 开启按键拦截后按下音量键，`native-key-down` 事件被触发。
   - 添加一个字体文件后，`getFontFamilies()` 能返回该字体。
   - 应用一个纹理后，阅读页背景改变；切换为 `none` 恢复默认。
验收问题（需结合源码回答）：
- `acquireVolumeKeyInterception` 为什么要维护 `volumeKeysInterceptionCount`？如果两个组件都请求拦截会发生什么？
- `handleNativeKeyDown` 为什么对 `Back` 用 `dispatchSync`？它与 `dispatch` 的区别是什么？
- `loadFont` 如何根据文件路径确定 `mimeType`？`getFontFormat` 与 `getMimeType` 做了什么？
- `addFont` 遇到重复 id 时如何处理？为什么要重置 `loaded/blobUrl/error`？
- `loadCustomFonts` 从 settings 恢复时为什么保留旧的 `loaded/blobUrl`？
- `applyTexture` 为什么要合并 `PREDEFINED_TEXTURES` 与自定义纹理？`id=none` 走什么分支？
- `loadTexture` 的 mimeType 映射表覆盖了哪些扩展名？缺失扩展名时默认是什么？
- `beforeunload` 里为什么要 revoke Blob URL？如果不做会怎样？

#### 第 40 课：补充 Store
- 覆盖模块：`apps/readest-app/src/store/transferStore.ts`、`parallelViewStore.ts`、`proofreadStore.ts`、`aiChatStore.ts`、`trafficLightStore.ts`。
- 任务：迁移剩余核心状态，补齐“传输队列 + 并行视图 + 校对规则 + AI 对话 + 窗口交通灯”。
子任务清单：
1. 先理解概念（新手友好）：
   - `transferStore` 管理上传/下载/删除队列，但不负责真实传输逻辑。
   - `parallelViewStore` 用 Set 维护并行视图分组（多书对照）。
   - `proofreadStore` 维护全局/书籍级的校对规则，并写回配置。
   - `aiChatStore` 管理对话历史，读写持久化存储。
   - `trafficLightStore` 负责 macOS 窗口交通灯位置与显示状态。
2. 代码清单（来自源码）：
   - `transferStore.ts`：`TransferItem`、`addTransfer`、`updateTransferProgress`、`setTransferStatus`、`restoreTransfers`。
   - `parallelViewStore.ts`：`setParallel`、`unsetParallel`、`areParallels`、`getParallels`。
   - `proofreadStore.ts`：`addRule/updateRule/removeRule/toggleRule`、`mergeRules`、`validateReplacementRulePattern`。
   - `aiChatStore.ts`：`loadConversations`、`setActiveConversation`、`createConversation`、`addMessage`。
   - `trafficLightStore.ts`：`initializeTrafficLightStore`、`setTrafficLightVisibility`、`initializeTrafficLightListeners`。
3. 逐步实现（建议顺序）：
   1) 实现 `transferStore`：定义 `TransferItem`，实现队列操作与统计方法。
   2) 实现 `parallelViewStore`：用 `Set<string>[]` 合并/拆分并行组。
   3) 实现 `proofreadStore`：规则生成、合并、写入 global 或 book 规则。
   4) 实现 `aiChatStore`：通过 `aiStore` 读写对话与消息。
   5) 实现 `trafficLightStore`：仅在 Tauri/macOS 可用，加入 fullscreen 监听。
   6) 在 UI 中加最小验证入口：传输队列列表、并行视图标记、规则列表、对话列表、交通灯开关。
4. 常见坑与验证提醒：
   - `transferStore.restoreTransfers` 会把 `in_progress` 重置为 `pending`，防止重启后卡死。
   - `setParallel` 会合并多个组，注意需要去重与删除旧组。
   - `proofreadStore` 对 `selection` scope 规则永远新增；`book` scope 会去重。
   - `aiChatStore` 使用缓存：如果 `currentBookHash` 不变且已有列表，会直接返回。
   - `trafficLightStore` 必须在客户端运行，且需要 `appService.hasTrafficLight` 为 true。
5. 最小验证（每步都能验证）：
   - 新增 1 个 transfer，更新进度后 UI 变化。
   - 设置两本书并行为同组，`areParallels` 返回 true。
   - 添加一条校对规则，再切换到阅读页确认规则生效。
   - 创建对话、发送消息后刷新页面，记录仍在。
   - Tauri macOS 下切换全屏，交通灯显示状态正确变化。
验收问题（需结合源码回答）：
- `TransferItem` 的 `status` 有哪些值？`setTransferStatus` 如何设置 `startedAt/completedAt`？
- `updateTransferProgress` 为什么同时记录 `transferredBytes/totalBytes/transferSpeed`？
- `restoreTransfers` 为什么把 `in_progress` 变成 `pending`？如果不处理会怎样？
- `setParallel` 如何处理多个已有并行组的合并？`uniqueKeys` 的作用是什么？
- `unsetParallel` 在 group size <= 1 时为什么删除整个组？
- `mergeRules` 为什么按 `rule.id` 去重？它如何保证全局规则覆盖书籍规则？
- `addBookRule` 为什么对 `selection` scope 不做去重？`book` scope 去重条件是什么？
- `updateBookViewSettings` 为什么要同时 `setViewSettings` 和 `saveConfig`？少一步会发生什么？
- `validateReplacementRulePattern` 对 regex 做了什么验证？返回结构是什么？
- `aiChatStore` 的 `createConversation` 如何生成 id？标题为空时如何兜底？
- `addMessage` 为什么要更新 `conversation.updatedAt`？否则列表排序会怎样？
- `setTrafficLightVisibility` 为什么要判断 `isFullscreen`？`set_traffic_lights` 的参数包含什么？
- `initializeTrafficLightListeners` 监听了哪些事件？对应状态字段如何更新？

### 阶段 F：阅读引擎与依赖模块（第 41-48 课）
#### 第 41 课：foliate-js 源码导读
- 覆盖模块：`packages/foliate-js/`。
- 任务：梳理 View/Renderer/Loaders 与事件模型，建立“从文件到渲染”的完整心智模型。
子任务清单：
1. 先理解概念（新手友好）：
   - `view.js` 是入口：把 loader、renderer、progress、annotations 串起来。
   - Renderer 只有两种：`foliate-paginator`（流式）与 `foliate-fxl`（固定布局）。
   - 事件模型是“renderer 触发 -> view 转发/补充 -> 上层消费”。
2. 代码清单（来自源码）：
   - 入口：`view.js`（`makeBook`、`open/close/init`、`resolveNavigation`、`addAnnotation`、`search`、`initTTS`）。
   - Loader：`epub.js`/`mobi.js`/`fb2.js`/`pdf.js`/`comic-book.js`、`makeZipLoader`、`makeDirectoryLoader`。
   - Renderer：`paginator.js`、`fixed-layout.js`（`customElements.define`、`observedAttributes`、`load/relocate/create-overlayer` 事件）。
   - 辅助：`progress.js`（`SectionProgress`/`TOCProgress`）、`overlayer.js`、`search.js`、`text-walker.js`、`tts.js`。
3. 逐步阅读（建议顺序）：
   1) `view.js`：从 `makeBook()` -> `open()`，记录“类型判定 -> 选择 renderer -> 事件绑定”。
   2) `paginator.js`：理解 `relocate`/`load`/`create-overlayer` 的 event.detail 结构。
   3) `fixed-layout.js`：理解 `zoom/scale-factor/spread` 的属性与渲染流程。
   4) `progress.js`：理解 `location/time/section` 如何计算。
   5) `overlayer.js` 与 `search.js`：理解搜索结果如何变成标注。
   6) `tts.js`：理解 `textWalker` + `segmenter` 如何生成朗读片段。
4. 输出整理（写入 `apps/br1/foliate-js.plan.md`）：
   - 模块职责地图（Loader/Renderer/Progress/Annotation/TTS）。
   - `<foliate-view>` 生命周期（open/init/relocate/close）。
   - 关键事件清单与 detail 字段。
5. 常见坑与验证提醒：
   - `makeBook()` 会根据文件头判断类型，`zip` 与 `pdf` 走完全不同路径。
   - `open()` 内部会创建 renderer 并设置 `exportparts`，CSS 需对 `::part` 生效。
   - `relocate` 的 `detail` 在 view 与 renderer 里含义不同，别混用。
   - `addAnnotation()` 对 `SEARCH_PREFIX/NOTE_PREFIX` 有特殊处理，容易忽略。
6. 最小验证（每步都能验证）：
   - 能画出 `open()` 的调用链路图。
   - 能列出至少 6 个 `foliate-view` 事件与 detail 结构。
   - 能解释 `SectionProgress.getProgress()` 输出的字段含义。
验收问题（需结合源码回答）：
- `makeBook()` 如何判断 ZIP/CBZ/FBZ/PDF/MOBI？分别调用了哪些模块？
- `open()` 为什么要初始化 `SectionProgress` 与 `TOCProgress`？它们依赖哪些 book 接口？
- `foliate-view` 选择 `foliate-paginator` 还是 `foliate-fxl` 的条件是什么？
- `History.pushState/replaceState` 在 `relocate` 时如何被调用？`reason` 如何影响？
- `resolveNavigation()` 接受哪些类型的参数？CFI 与 href 分支如何分流？
- `addAnnotation()` 为什么要识别 `foliate-search:`/`foliate-note:`？这些前缀用在什么场景？
- `search()` 为什么是 async generator？它如何一边搜索一边更新结果？
- `paginator.js` 的 `relocate` detail 中 `fraction/size` 在翻页模式如何计算？

#### 第 42 课：FoliateView 最小封装
- 覆盖模块：`apps/br1/src/lib/reader/FoliateView.svelte`。
- 任务：动态 import `foliate-js/view.js` 并 `open(bookDoc)`，实现可复用的 Svelte 组件。
子任务清单：
1. 先理解概念（新手友好）：
   - `foliate-view` 是自定义元素，必须在浏览器里注册后才能创建。
   - `open(bookDoc)` 是异步的，必须等 `bookDoc` 准备好。
   - `close()` 需要在组件销毁时调用，避免内存泄漏。
2. 代码清单（来自源码）：
   - `packages/foliate-js/view.js`：`customElements.define('foliate-view', View)`。
   - `apps/readest-app/src/types/view.ts`：`FoliateView` 接口、`wrappedFoliateView()`。
   - `apps/readest-app/src/app/reader/components/FoliateViewer.tsx`：`import('foliate-js/view.js')` + `document.createElement('foliate-view')` + `open(bookDoc)`。
3. 逐步实现（建议顺序）：
   1) 新建 `FoliateView.svelte`：定义 `export let bookDoc`、`export let lastLocation?`。
   2) 在 `onMount` 中 `await import('foliate-js/view.js')`，再 `document.createElement('foliate-view')`。
   3) 可选：用 `wrappedFoliateView()` 包装，统一 `addAnnotation` 行为。
   4) 将 element append 到容器，等待 `bookDoc` 后 `await view.open(bookDoc)`。
   5) 若 `lastLocation` 存在，调用 `view.init({ lastLocation })` 或 `goToFraction(0)`。
   6) `onDestroy` 调 `view.close()` 并移除 DOM，解绑事件。
4. 常见坑与验证提醒：
   - 没 import `view.js` 直接 `createElement` 会导致自定义元素未注册。
   - `bookDoc` 变化时要避免重复 open，必要时先 `close()`。
   - SSR 下不能执行 `document.createElement`，必须放在 `onMount`。
   - `open()` 抛错要捕获，否则会阻断页面渲染。
5. 最小验证（每步都能验证）：
   - 传入一个 `bookDoc`，页面能显示内容。
   - 切换 `bookDoc`，旧视图被关闭，新视图可打开。
   - 组件卸载后 `view` 被清理（DOM 消失 + 无报错）。
验收问题（需结合源码回答）：
- 为什么必须 `import('foliate-js/view.js')` 后再创建 `<foliate-view>`？
- `wrappedFoliateView()` 修改了哪个方法？这样做的目的是什么？
- `view.open()` 接受的 `bookDoc` 来自哪里？它与 `DocumentLoader` 的关系是什么？
- `view.init({ lastLocation })` 与 `view.goToFraction(0)` 的使用场景区别是什么？
- 在 Svelte 中如何避免 `bookDoc` 变化导致多次 `open()` 竞争？
- `view.close()` 会清理哪些内部状态？从源码中能看到哪些字段被重置？

#### 第 43 课：事件桥接与进度
- 覆盖模块：`apps/readest-app/src/app/reader/hooks/useFoliateEvents.ts`。
- 任务：监听 `load/relocate` 与 renderer 事件，桥接到 reader store 与 UI。
子任务清单：
1. 先理解概念（新手友好）：
   - `foliate-view` 自身会发 `relocate`，带 `cfi/tocItem/section/location/time`。
   - `renderer` 也会发 `relocate`，用于滚动/分页的实时定位（并行视图同步依赖它）。
   - 事件都来自 iframe 内文档，需要小心 Range 生命周期。
2. 代码清单（来自源码）：
   - `useFoliateEvents.ts`：`load`/`relocate`/`link`/`renderer-relocate` 绑定。
   - `FoliateViewer.tsx`：`progressRelocateHandler`、`docRelocateHandler`。
   - `view.js`：`#emit('relocate', detail)` 详情字段。
   - `paginator.js`：`relocate` detail 中的 `reason/range/index/fraction/size`。
3. 逐步实现（建议顺序）：
   1) 在 Svelte 中写 `bindFoliateEvents(view, handlers)` 工具，统一 add/remove。
   2) 处理 `load`：标记文档已加载，更新 UI loading 状态。
   3) 处理 `relocate`：调用 `readerStore.setProgress(bookKey, detail.cfi, ...)`。
   4) 处理 renderer `relocate`：仅对 `reason === 'scroll'|'page'` 同步并行视图。
   5) 可选：监听 `link` 与 `external-link`，将外部链接打开或提示。
4. 常见坑与验证提醒：
   - `detail.range` 是 `Range`，不要直接存入持久化状态。
   - `renderer` 只有在 `view.open()` 后存在，绑定时机要正确。
   - `docRelocateHandler` 里要过滤 `reason`，否则会触发无限跳转。
   - 事件监听要在销毁时 remove，否则会重复触发。
5. 最小验证（每步都能验证）：
   - 翻页时 `progress` 状态更新，UI 百分比变化。
   - 滚动模式下 `renderer-relocate` 触发并行视图定位。
   - 点击内链触发 `link` 事件；外链触发 `external-link`。
验收问题（需结合源码回答）：
- `relocate` detail 中的 `location/time/section` 来自哪个模块？它们如何计算？
- `progressRelocateHandler` 里为什么要传 `detail.range`？哪一层需要它？
- `docRelocateHandler` 为什么只处理 `scroll/page`？如果处理 `snap` 会发生什么？
- `view.js` 中 `#onRelocate` 为什么会 `history.replaceState`？这一行对回退有什么影响？
- `renderer` 的 `relocate` 与 `view` 的 `relocate` detail 字段有何差异？
- `link` 事件与 `external-link` 事件分别在什么条件下触发？
- Svelte 中如何确保事件监听只注册一次？对应的生命周期钩子是什么？

#### 第 44 课：渲染器属性与布局
- 覆盖模块：`apps/readest-app/src/app/reader/components/FoliateViewer.tsx`。
- 任务：设置 flow/gap/size/zoom/spread 等属性，让布局与阅读设置一致。
子任务清单：
1. 先理解概念（新手友好）：
   - `foliate-paginator` 用属性控制排版；`foliate-fxl` 用 `zoom/scale-factor/spread`。
   - 阅读设置（viewSettings）需要映射为 renderer 属性，并考虑 safe area、header/footer。
   - 变化应尽量“无重载”应用，避免重新 open。
2. 代码清单（来自源码）：
   - `FoliateViewer.tsx`：`view.renderer.setAttribute(...)`、`applyMarginAndGap()`、`getStyles()`。
   - `paginator.js`：`observedAttributes`（`flow/gap/margin-*/max-*/max-column-count`）。
   - `fixed-layout.js`：`observedAttributes`（`zoom/scale-factor/spread`）。
   - `utils/style.ts`：`getStyles`、`applyThemeModeClass`、`applyScrollModeClass`。
3. 逐步实现（建议顺序）：
   1) 判断 layout：`bookDoc.rendition.layout === 'pre-paginated'` -> fixed-layout。
   2) 设置基础样式：`renderer.setStyles(getStyles(viewSettings))`。
   3) 流式书：设置 `max-column-count/max-inline-size/max-block-size/gap/flow`。
   4) 固定布局：设置 `zoom/spread/scale-factor`，并处理 cover spread。
   5) 实现 `applyMarginAndGap()`：结合 safe area、header/footer、TTS bar 计算边距。
   6) 监听 `viewSettings` 变化并更新 renderer 属性（不要重新 open）。
4. 常见坑与验证提醒：
   - `flow=scrolled` 时 `max-column-count` 不生效；要靠 `size` 控制。
   - `gap` 是百分比；`margin-*` 是 px，单位必须正确。
   - `zoom` 在固定布局下可为 `fit-width/fit-page` 或数值。
   - `scale-factor` 需要 0-100 的百分比，不是 0-1。
   - iOS/Android 的 safe area 会改变 margin 计算，别忽略 `insets`。
5. 最小验证（每步都能验证）：
   - 切换“滚动/分页”模式，视图切换无报错。
   - 调整 `gap` 与 `margin`，页面布局明显变化。
   - 固定布局书中切换 `spread/zoom`，页面缩放与双页变化生效。
验收问题（需结合源码回答）：
- `paginator.js` 支持哪些属性？哪些是 `observedAttributes`？
- `applyMarginAndGap()` 中 `viewMargins` 为 true 时为什么把 margin 设为 0？
- `bookDoc.rendition.spread` 与 `section.pageSpread` 在固定布局里有什么作用？
- 为什么在 `openBook` 里同时设置 `animated` 与 `eink` 属性？它们分别影响什么？
- `max-inline-size` 与 `max-block-size` 的计算来自哪些 viewSettings？在竖排时有什么变化？
- `showHeader/showFooter/showTTSBar` 如何影响 top/bottom margin？
- `getStyles()` 生成的 CSS 为什么要每次设置？哪些设置变化会影响它？

#### 第 45 课：PDF.js 与 simplecc
- 覆盖模块：`apps/readest-app/scripts/*pdfjs*`、`packages/foliate-js/vendor/pdfjs`、`packages/simplecc-wasm`。
- 任务：建立 PDF.js 资源复制与 simplecc wasm 资源加载流程，保证 Web 端可直接渲染 PDF 和繁简转换。
子任务清单：
1. 先理解概念（新手友好）：
   - PDF.js 和 simplecc 都依赖“静态资源”，必须放到 `public/static` 类目录。
   - `foliate-js/pdf.js` 固定从 `/vendor/pdfjs/` 读取 worker/cmaps/fonts/css。
   - `simplecc` 需要 `simplecc_wasm_bg.wasm`，路径必须稳定。
2. 代码清单（来自源码）：
   - 资源脚本：`apps/readest-app/package.json`（`setup-vendors`、`copy-pdfjs-*`、`copy-simplecc`）。
   - 资源路径：`packages/foliate-js/pdf.js`（`pdfjsPath('/vendor/pdfjs/...')`）。
   - wasm 入口：`apps/readest-app/src/utils/simplecc.ts`（`init('/vendor/simplecc/simplecc_wasm_bg.wasm')`）。
   - 类型别名：`apps/readest-app/tsconfig.json`（`@pdfjs/*`、`@simplecc/*`）。
   - 验证用例：`apps/readest-app/src/__tests__/utils/simplecc.test.ts`。
3. 逐步实现（建议顺序）：
   1) 在 `apps/br1` 创建 `static/vendor/pdfjs` 与 `static/vendor/simplecc`。
   2) 抄写 `copy-pdfjs-js`/`copy-pdfjs-wasm`/`copy-pdfjs-fonts` 脚本到 `apps/br1/package.json`。
   3) 迁移 `copy-flatten-pdfjs-css`（flatten `annotation_layer_builder.css`/`text_layer_builder.css`）。
   4) 迁移 `copy-simplecc`：将 `packages/simplecc-wasm/dist/web/*` 复制到 `static/vendor/simplecc`。
   5) 在 SvelteKit 配置里添加 alias（或直接使用绝对路径 `/vendor/...`）。
   6) 在 `foliate-js/pdf.js` 可用前执行 `pnpm setup-vendors`。
4. 常见坑与验证提醒：
   - `pdfjsLib.GlobalWorkerOptions.workerSrc` 必须指向可访问的 `.mjs` 文件，否则 PDF 会白屏。
   - `cmaps`/`standard_fonts` 目录缺失会导致部分 PDF 无法渲染或乱码。
   - CSS 需要 flatten，否则 nested 语法在浏览器无法直接解析。
   - `simplecc` wasm 路径不对会导致转换函数无响应或抛错。
   - SvelteKit 的静态目录是 `static/`，路径应该以 `/vendor/...` 访问。
5. 最小验证（每步都能验证）：
   - 打开 `public/vendor/pdfjs/pdf.worker.min.mjs` 确认资源可访问。
   - `foliate-js` 打开 PDF，控制台无 worker 404 报错。
   - 调用 `simplecc('发财了去植发', 's2t')` 得到繁体结果。
验收问题（需结合源码回答）：
- `pdfjsPath()` 为什么固定 `/vendor/pdfjs/`？这个路径由谁提供？
- `copy-pdfjs-js` 为何从 `pdfjs-dist/legacy/build` 复制？与 `build/` 版本有何差异？
- `copy-flatten-pdfjs-css` 为什么要经过 `postcss-nested`？不处理会发生什么？
- `makePDF()` 在 `foliate-js/pdf.js` 中设置了哪些 PDF.js 资源 URL（worker/cmaps/fonts/wasm）？
- `simplecc` 的 wasm 文件名是什么？在 `initSimpleCC()` 里如何引用？
- `@pdfjs/*` 与 `@simplecc/*` 的 alias 在 SvelteKit 中该如何替代？
- `simplecc` 的测试用例覆盖了哪些转换方向？如何用它验证资源是否加载成功？

#### 第 46 课：内容转换管线
- 覆盖模块：`apps/readest-app/src/services/transformers/*`。
- 任务：在阅读渲染前接入 transform 管线，保证 CSS/HTML 都能按设置预处理。
子任务清单：
1. 先理解概念（新手友好）：
   - 内容转换分两层：CSS（`transformStylesheet`）与 HTML（`transformContent`）。
   - 接入点是 `book.transformTarget` 的 `data` 事件。
   - `detail.data` 可以是 Promise，允许异步转换。
2. 代码清单（来自源码）：
   - `services/transformService.ts` 与 `transformers/*`。
   - `FoliateViewer.tsx` 的 `getDocTransformHandler()`（CSS/HTML 分支）。
   - `utils/style.transformStylesheet()`（处理 `page-break-after`、`vw/vh` 等）。
3. 逐步实现（建议顺序）：
   1) 在 Svelte 端实现 `getDocTransformHandler({ width, height })`。
   2) 如果 `detail.type === 'text/css'`，调用 `transformStylesheet`。
   3) 如果 `detail.type` 为 HTML（`application/xhtml+xml`/`text/html`），构造 `TransformContext`。
   4) `TransformContext.transformers` 顺序参考 Readest：`style`→`punctuation`→`footnote`→`whitespace`→`language`→`sanitizer`→`simplecc`→`proofread`。
   5) 将转换后的结果写回 `detail.data`。
   6) 在 `view.open()` 后绑定 `book.transformTarget.addEventListener('data', handler)`。
4. 常见坑与验证提醒：
   - `detail.data` 可能是 Blob/String/Promise，需统一用 `Promise.resolve`。
   - `transformStylesheet` 依赖 `window.innerWidth/Height`，要传入正确尺寸。
   - `simplecc` 需要 wasm 资源就绪，否则转换会失败。
   - `sanitizer` 生成完整 XML 文档，重复处理会导致嵌套。
5. 最小验证（每步都能验证）：
   - 在 EPUB 中写 `<script>`，开启 sanitizer 后脚本应被移除。
   - 在 CSS 中使用 `vw/vh`，渲染后应变成 px。
   - 开启 `convertChineseVariant`，文字应发生繁简变化。
验收问题（需结合源码回答）：
- `getDocTransformHandler` 如何区分 CSS 与 HTML？判断条件在哪里？
- `transformContent` 的执行顺序为何重要？如果把 `sanitizer` 放最前会怎样？
- `transformStylesheet` 处理 `page-break-after: always` 的逻辑是什么？
- `simpleccTransformer` 在 DOM 中如何遍历文本节点？它为何跳过 `script/style`？
- `proofreadTransformer` 如何读取全局与书籍规则？Svelte 里该如何替换 `getState()`？
- `book.transformTarget` 的 `data` 事件 detail 中有哪些字段？哪些字段必须保留？

#### 第 47 课：Iframe 事件与手势
- 覆盖模块：`apps/readest-app/src/app/reader/hooks/useIframeEvents.ts`、`iframeEventHandlers.ts`。
- 任务：处理 mouse/touch/keyboard 与翻页手势。
子任务清单：
1. 先理解概念（新手友好）：
   - 书内容在 iframe 内，事件需要 `postMessage` 到主窗口。
   - 主窗口再通过 `useMouseEvent/useTouchEvent` 分发到翻页与手势逻辑。
   - 事件里必须带 `bookKey`，避免多书视图串线。
2. 代码清单（来自源码）：
   - `iframeEventHandlers.ts`：`handleKeydown/keyup/mousedown/mouseup/wheel/click/touch*`。
   - `useIframeEvents.ts`：`useMouseEvent`、`useTouchEvent`（`window.addEventListener('message')`）。
   - 相关常量：`DOUBLE_CLICK_INTERVAL_THRESHOLD_MS`、`LONG_HOLD_THRESHOLD`。
   - 下游处理：`usePagination.ts`、`eventDispatcher`（`zoom-in/out`、`footnote-popup`）。
3. 逐步实现（建议顺序）：
   1) 在 `docLoadHandler` 中为 iframe 文档注册事件（与 Readest 一致）。
   2) 在事件处理器里 `postMessage`，包含 `bookKey` 与必要坐标。
   3) 在 Svelte 端监听 `window.message`，按 `type` 分流（`iframe-wheel`/`iframe-single-click`/`iframe-touch*`）。
   4) 将 `iframe-single-click` 交给 `usePagination` 的逻辑处理。
   5) 将 `iframe-wheel` 与 `ctrlKey` 组合识别为缩放（`zoom-in/out`）。
   6) 处理 long-hold 与双击逻辑，避免重复触发单击。
4. 常见坑与验证提醒：
   - `postMessage` 需要 `bookKey`，否则多视图会互相影响。
   - 双击与单击间隔依赖阈值，过低会误判。
   - `iframe-wheel` 在 scrolled 模式下应交给 iframe 自身处理。
   - `eventDispatcher.dispatchSync('iframe-single-click')` 可阻止翻页。
5. 最小验证（每步都能验证）：
   - 单击左右区域翻页，中心区域切换工具栏。
   - 滚轮翻页在分页模式生效，滚动模式不干扰。
   - 触摸滑动触发翻页或隐藏工具栏。
验收问题（需结合源码回答）：
- `handleClick` 如何区分单击与双击？`DOUBLE_CLICK_INTERVAL_THRESHOLD_MS` 起什么作用？
- `handleMouseup` 为什么要拦截 `button` 3/4？它对应浏览器的什么行为？
- `handleWheel` 何时触发 `zoom-in/out`？这段逻辑在哪里？
- `useMouseEvent` 为什么要 `debounce`？`debounceScroll` 与 `debounceFlip` 作用有何不同？
- `useTouchEvent` 中 `deltaY/deltaX/deltaT` 是如何计算的？它如何决定翻页方向？
- `eventDispatcher.dispatch('footnote-popup')` 触发条件是什么？它如何从 DOM 提取 footnote 文本？
- 为什么 `docLoadHandler` 要用 `isEventListenersAdded` 防重复？

#### 第 48 课：进度同步与并行视图
- 覆盖模块：`useProgressSync.ts`、`useProgressAutoSave.ts`、`usePagination.ts`、`parallelViewStore.ts`。
- 任务：实现进度同步、自动保存与并行视图定位。
子任务清单：
1. 先理解概念（新手友好）：
   - `useProgressAutoSave` 负责“本地节流保存”。
   - `useProgressSync` 负责“云端 pull/push”并处理冲突。
   - 并行视图用 `parallelViewStore` 维护分组，renderer relocate 时同步位置。
2. 代码清单（来自源码）：
   - `useProgressAutoSave.ts`：`throttle` + `saveConfig`。
   - `useProgressSync.ts`：`syncConfigs`、`serializeConfig`、`getCFIFromXPointer/getXPointerFromCFI`。
   - `usePagination.ts`：翻页触发 `view.prev/next`。
   - `parallelViewStore.ts`：`setParallel/unsetParallel/getParallels`。
3. 逐步实现（建议顺序）：
   1) 先实现 `useProgressAutoSave`：进度变化后 5s 保存，10s 节流。
   2) 实现 `useProgressSync` 的 pull-once + debounce push。
   3) 通过 `serializeConfig` 压缩配置，删除 `booknotes` 再上传。
   4) 使用 `CFI.compare` 与 `xpointer` 选择更靠后的进度。
   5) 并行视图：在 `renderer-relocate` 中同步 `goTo({ index, anchor })`。
4. 常见坑与验证提醒：
   - 未登录时 `syncConfigs` 会报错，必须在 UI 上提示。
   - `xpointer` 转换依赖文档 `doc/index`，失败要 catch。
   - `configPulled` 标记用于避免拉取/推送死循环。
   - 并行视图同步只应在 `scroll/page` 原因下触发。
5. 最小验证（每步都能验证）：
   - 翻页后本地 `config.location` 持久化。
   - 登录后进度自动上传，重新打开能自动跳到更靠后的进度。
   - 同一书双视图，滚动一端另一端同步到对应章节。
验收问题（需结合源码回答）：
- `useProgressAutoSave` 为什么 `throttle` 里还 `setTimeout(5000)`？这两层节流各自的目的是什么？
- `serializeConfig` 为什么要删除 `booknotes`？这个字段对同步的影响是什么？
- `getXPointerFromCFI` 与 `getCFIFromXPointer` 用在什么场景？为什么要做双向转换？
- `applyRemoteProgress` 里如何决定“远端进度是否更靠后”？用到了哪个比较方法？
- `syncConfig` 里 `configPulled` 的作用是什么？没有它会出现什么循环？
- 并行视图同步时为何使用 renderer 的 `fraction` 而不是直接用 CFI？
- `eventDispatcher.dispatch('hint')` 在同步成功时起什么作用？

### 阶段 G：阅读器 UI 与交互（第 49-56 课）
#### 第 49 课：Reader 页面框架
- 覆盖模块：`apps/readest-app/src/app/reader/components/Reader.tsx`、`apps/readest-app/src/hooks/useTheme.ts`、`apps/readest-app/src/hooks/useScreenWakeLock.ts`、`apps/readest-app/src/hooks/useTransferQueue.ts`、`apps/readest-app/src/utils/bridge.ts`、`apps/readest-app/src/utils/open.ts`、`apps/readest-app/src/styles/fonts.ts`。
- 任务：搭建 Reader 根页面，补齐系统 UI 控制、唤醒锁、亮度、全局弹窗与平台适配。
子任务清单：
1. 先理解概念（新手友好）：
   - Reader 是阅读器“全局壳”，负责初始化主题、系统 UI、平台桥接与全局弹窗。
   - 这些逻辑都是“副作用”，Svelte 中要用 `onMount/onDestroy` 管理生命周期。
   - 移动端的系统 UI/亮度/唤醒锁需要权限与平台判断。
2. 代码清单（来自源码）：
   - `Reader.tsx`：`useTheme`、`useScreenWakeLock`、`useTransferQueue`、`handleKeyDown`、`setSystemUIVisibility`。
   - `useTheme.ts`：`updateAppTheme`、`setStatusBarHeight`、`setSystemUIVisibility`。
   - `useScreenWakeLock.ts`：`navigator.wakeLock.request`、`visibilitychange`、`onFocusChanged`。
   - `useTransferQueue.ts`：`transferManager.initialize`、队列统计与控制函数。
   - 工具函数：`mountAdditionalFonts`、`interceptWindowOpen`、`getSysFontsList`、`initDayjs`。
3. 逐步实现（建议顺序）：
   1) 新建 `apps/br1/src/lib/reader/Reader.svelte`（或 `routes/reader/+page.svelte` 中引入），从 store 获取 `settings`/`libraryLoaded`/`hoveredBookKey`。
   2) 在 `onMount` 做一次性初始化：`mountAdditionalFonts`、`interceptWindowOpen`、`initDayjs(getLocale())`；Tauri 下延迟 `getSysFontsList()`。
   3) 迁移 `useTheme` 逻辑：根据 `settings.alwaysShowStatusBar` + `hoveredBookKey` 控制系统 UI，更新主题色。
   4) 迁移 `useScreenWakeLock(settings.screenWakeLock)`；注意 Web/Tauri 分支与清理。
   5) 迁移亮度逻辑：`appService.hasScreenBrightness` + `autoScreenBrightness` 判定；iOS 记录并恢复 `previousBrightness`。
   6) 迁移 Android 返回键：`acquireBackKeyInterception` + 监听 `native-key-down`，优先关闭 Sidebar/Notebook。
   7) 在 JSX/Svelte 里渲染 `ReaderContent` 与全局弹窗（About/Updater/KOSync/ProofreadRules/Toast）。
4. 常见坑与验证提醒：
   - 这些副作用必须只在浏览器执行，Svelte 必须放在 `onMount`。
   - 亮度/系统 UI 改动后要在 `onDestroy` 里恢复，避免影响系统状态。
   - `native-key-down` 事件要配套解绑，避免重复监听。
   - `libraryLoaded` 与 `settings.globalReadSettings` 为 false 时渲染空壳，避免 NPE。
5. 最小验证（每步都能验证）：
   - Mobile 上切换 hover/点击时，系统 UI 能显示/隐藏。
   - 屏幕亮度在进入 Reader 后改变，离开后恢复。
   - Android 返回键能先关侧栏/笔记，再退出。
   - 全局弹窗组件可正常挂载（显示/关闭无报错）。
验收问题（需结合源码回答）：
- `mountAdditionalFonts` 与 `interceptWindowOpen` 在哪个 effect 中调用？为什么要放在初始化阶段？
- `getSysFontsList` 为什么要延迟 3 秒？它只在什么平台触发？
- `setScreenBrightness` 的触发条件是什么？`autoScreenBrightness` 如何影响流程？
- iOS 分支是如何记录并恢复 `previousBrightness` 的？
- Android 返回键事件为什么要先检查 Sidebar/Notebook？相关 getter 是哪些？
- `eventDispatcher.dispatch('close-reader')` 与 `router.back()` 的调用顺序是什么？
- `useTheme` 如何计算 system UI 的可见性？涉及哪些 store 字段？
- `libraryLoaded && settings.globalReadSettings` 的判断有什么意义？不判断会出现什么问题？
- Reader 页面挂载了哪些全局弹窗组件？它们对应哪些功能模块？

#### 第 50 课：ReaderContent 与多书管理
- 覆盖模块：`apps/readest-app/src/app/reader/components/ReaderContent.tsx`、`apps/readest-app/src/app/reader/hooks/useBooksManager.ts`、`apps/readest-app/src/app/reader/hooks/useBookShortcuts.ts`、`apps/readest-app/src/hooks/useGamepad.ts`、`apps/readest-app/src/helpers/openWith.ts`、`apps/readest-app/src/utils/window.ts`、`apps/readest-app/src/services/constants.ts`。
- 任务：实现多书会话初始化、关闭与返回逻辑。
子任务清单：
1. 先理解概念（新手友好）：
   - 多书会话 = `bookKeys[]`，每本书都有唯一 `bookKey`（`id-uniqueId`）。
   - `initViewState` 会创建 view 与 config，并标记主视图。
   - 关闭逻辑要保存进度、退出 TTS、处理 Tauri 窗口。
2. 代码清单（来自源码）：
   - `ReaderContent.tsx`：URL 解析、`initViewState`、`handleCloseBooks`、`handleCloseBook`。
   - `useBooksManager.ts`：`appendBook`、`dismissBook`、`openParallelView`、`getNextBookKey`。
   - `useBookShortcuts.ts`：快捷键与翻页/缩放/打开设置。
   - `useGamepad.ts`：手柄 -> 键盘事件映射。
   - 平台：`tauriHandleOnCloseWindow`、`tauriHandleClose`、`parseOpenWithFiles`、`BOOK_IDS_SEPARATOR`。
3. 逐步实现（建议顺序）：
   1) 在 ReaderContent 初始化时解析 `ids`：优先 `props.ids`，否则 `searchParams` 或 `/reader/:ids` 路径。
   2) 生成 `bookKeys`（`id-uniqueId`），写入 store，并对每个 `bookKey` 调 `initViewState`；第一个作为 `sideBarBookKey`。
   3) 迁移错误处理：初始化失败时 `dispatch('toast')`，并回退到 Library。
   4) 迁移 `lastOpenBooks` 保存逻辑（与 settings 持久化联动）。
   5) 迁移关闭流程：`saveBookConfig` -> `saveConfigAndCloseBook` -> `handleCloseBook/handleCloseBooks`。
   6) 处理 Tauri 窗口关闭：`beforeunload`/`close-reader`/`quit-app` + `tauriHandleOnCloseWindow`。
   7) 加入 `useBookShortcuts()` 与 `useGamepad()` 绑定（保证新手也能用快捷键）。
   8) 渲染 `SideBar`、`BooksGrid`、`SettingsDialog`、`Notebook`、`BookDetailModal`。
4. 常见坑与验证提醒：
   - URL 中可能包含重复 id；`isPrimary` 只能用于第一次出现的 id。
   - `handleCloseBooks` 用 `throttle`，避免重复触发保存。
   - `getView(bookKey)` 关闭时要 `close()` + `remove()`，否则 iframe 泄露。
   - Tauri 下 `currentWindow.label` 不同，关闭逻辑要区分主窗/阅读窗。
   - `bookKeys` 为空时应返回 `null`，否则会触发渲染错误。
5. 最小验证（每步都能验证）：
   - `/reader/ID1,ID2` 能打开两本书，侧栏书签在第一本。
   - 关闭一本书后 URL `ids` 更新，最后一本关闭后回到 Library。
   - 刷新页面能恢复 `lastOpenBooks`（或至少保存成功）。
   - Tauri 读书窗关闭后不会丢失进度。
验收问题（需结合源码回答）：
- ReaderContent 从哪些位置解析 `bookIds`？优先级如何？
- `BOOK_IDS_SEPARATOR` 是什么？解析时如何过滤空 id？
- `initialBookKeys` 为什么要拼 `uniqueId()`？不用会有什么问题？
- `isPrimary` 如何判定？为什么要用 `uniqueIds` 集合？
- `initViewState` 失败时触发了哪些 UI 行为？toast 的 callback 做了什么？
- `saveBookConfig` 为什么只对 `isPrimary` 执行？它在保存前 dispatch 了哪些事件？
- `handleCloseBooks` 为什么要 `throttle(200)`？它在哪些事件里被调用？
- `handleCloseBook` 在“最后一本书”分支中如何区分 `openWith`/Tauri 窗口？
- `lastOpenBooks` 何时写入 settings？为什么要比较 `toString()`？
- `BookDetailModal` 是通过哪个事件打开的？事件名是什么？

#### 第 51 课：Header 与进度信息
- 覆盖模块：`apps/readest-app/src/app/reader/components/HeaderBar.tsx`、`SectionInfo.tsx`、`ProgressInfo.tsx`、`ReadingRuler.tsx`、`annotator/AnnotationTools.tsx`。
- 任务：迁移顶部工具栏、章节/进度信息与阅读标尺。
子任务清单：
1. 先理解概念（新手友好）：
   - Header/Progress 都是“浮层”，显示条件由 `hoveredBookKey` 与 `viewSettings` 控制。
   - 安全区与圆角窗体需要用 `gridInsets`/`statusBarHeight` 做补偿。
   - ReadingRuler 是一个可拖动的引导线，需要跟随页面进度自动移动。
2. 代码清单（来自源码）：
   - `HeaderBar.tsx`：`isHeaderVisible`、`isMouseOutsideHeader`、`annotationQuickAction`、`ViewMenu`。
   - `SectionInfo.tsx`：顶部章节文字与纵排布局。
   - `ProgressInfo.tsx`：`progressInfoMode`/`cycleProgressInfoModes`、`formatProgress`。
   - `ReadingRuler.tsx`：`calculateRulerSize`、auto-move、拖拽保存。
3. 逐步实现（建议顺序）：
   1) 在 store 中准备 `hoveredBookKey`，并在 Header/Progress/Footbar 里复用显示逻辑。
   2) 实现 HeaderBar 的布局：左侧切换按钮、中心标题、右侧设置/笔记/视图菜单。
   3) 加入 `pointerInDoc` 逻辑（避免选区时误触）：检测 `renderer.getContents().doc.body.style.cursor`。
   4) 实现 `SectionInfo`：横排/纵排两套布局，点击后设置 `hoveredBookKey`。
   5) 实现 `ProgressInfo`：显示“百分比/页码/剩余时间”，点击可切换模式并保存。
   6) 实现 `ReadingRuler`：尺寸计算、自动定位、拖拽保存位置。
4. 常见坑与验证提醒：
   - Header 的显示由 `hoveredBookKey` + `isDropdownOpen` 决定，别只看 hover。
   - `systemUIVisible` 会影响 top margin，移动端要加上 `statusBarHeight`。
   - ProgressInfo 在 `tapToToggleFooter` 为 false 时不应切换模式。
   - ReadingRuler 使用 `ResizeObserver`，在 Svelte 里要记得 `disconnect`。
   - 纵排模式下 `writing-vertical-rl` 与 `rtl` 方向相关，布局容易颠倒。
5. 最小验证（每步都能验证）：
   - Hover 书页时 Header/Progress 显示，移开后自动隐藏。
   - 点击 ProgressInfo 可切换显示“剩余时间/页数/百分比”。
   - ReadingRuler 可拖动并记住位置，翻页时自动调整。
   - 纵排模式下 Section/Progress 位置不遮挡正文。
验收问题（需结合源码回答）：
- `HeaderBar` 的 `isHeaderVisible` 条件是什么？`isDropdownOpen` 起什么作用？
- `pointerInDoc` 如何判断？为什么要加 `pointer-events-none`？
- `annotationQuickAction` 的默认按钮如何选？`getHighlightColorHex` 用于哪个 UI？
- `trafficLightInHeader` 何时为 true？它依赖哪些平台/布局条件？
- `SectionInfo` 的 `topInset` 如何计算？Android 上为什么要除以 2？
- `SectionInfo` 在 hover 状态下为什么隐藏文字？这对应什么交互？
- `ProgressInfo` 的 `progressInfoMode` 循环顺序是什么？它如何避免“切换但无变化”？
- `formatProgress` 的模板如何根据 `progressStyle` 与 `isVertical` 变化？
- `ReadingRuler` 对固定布局书籍为什么使用 `FIXED_LAYOUT_LINE_HEIGHT`？
- `ReadingRuler` 自动定位依赖 `progress.pageinfo` 的哪个字段？为何要用 `Range.getClientRects()`？
- 拖拽 ReadingRuler 时为什么要 `setPointerCapture`？释放时保存逻辑在哪？

#### 第 52 课：Footer 与视图菜单
- 覆盖模块：`apps/readest-app/src/app/reader/components/footerbar/*`、`apps/readest-app/src/app/reader/components/ViewMenu.tsx`、`apps/readest-app/src/app/reader/hooks/usePagination.ts`、`apps/readest-app/src/utils/style.ts`。
- 任务：迁移底部控制条、移动端面板与视图设置菜单。
子任务清单：
1. 先理解概念（新手友好）：
   - FooterBar 是“操作中心”：翻页、进度、TTS、TOC、字体与主题。
   - 桌面与移动端 UI 完全不同，要用条件渲染拆分组件。
   - ViewMenu 负责“渲染属性”开关（滚动/缩放/双页/主题）。
2. 代码清单（来自源码）：
   - `FooterBar.tsx`：进度计算、hover 显示、Android back key、`navigationHandlers`。
   - `DesktopFooterBar.tsx`：range 进度条与左右翻页按钮。
   - `MobileFooterBar.tsx`：`NavigationPanel`/`FontLayoutPanel`/`ColorPanel`/`NavigationBar`。
   - `ViewMenu.tsx`：`scrolled`/`zoom`/`spread`/`keepCoverSpread`/`themeMode`/`sync`。
   - `footerbar/utils.ts`：`getNavigationIcon/Label/Handler` 处理 RTL。
3. 逐步实现（建议顺序）：
   1) 实现 `FooterBar` 容器：根据 `hoveredBookKey` 控制显示；计算 `progressFraction` 并 `debounce` 跳转。
   2) 实现桌面 Footer：按钮 + range；接入 `viewPagination` 与 `view.history`。
   3) 实现移动端面板：导航/进度/字体/颜色四类 panel + 底部 tab。
   4) 迁移 `ColorPanel`：亮度 slider（指数映射）、主题色切换、`themeMode` 循环。
   5) 迁移 `FontLayoutPanel`：字体大小、行高、页边距，更新 renderer `margin/gap`。
   6) 迁移 `ViewMenu`：滚动模式/缩放模式/双页/封面分栏/同步/主题/全屏。
4. 常见坑与验证提醒：
   - `progressValid` 要判断 total>0，否则除零。
   - 移动端面板需要考虑安全区，`bottomOffset` 要加上 `gridInsets.bottom`。
   - `handleSetActionTab('toc'/'note')` 需要改 `sideBarTab` 并打开侧栏。
   - 预分页（PDF/FIXED）才显示 zoom/spread 选项，判断 `bookDoc.rendition.layout`。
   - 切换 `scrolled` 时必须同步 `renderer` 的 `flow`、`max-inline-size`、`styles`。
5. 最小验证（每步都能验证）：
   - 桌面 Footer 能翻页/翻章节/跳进度。
   - 移动端按钮能切换到“字体/颜色/进度”面板并生效。
   - ViewMenu 切换滚动/缩放/双页后渲染立即变化。
   - Sync 按钮在登录/未登录时有不同提示。
验收问题（需结合源码回答）：
- `FooterBar` 的 `progressFraction` 如何计算？`progressValid` 的判定条件是什么？
- `handleProgressChange` 使用了什么防抖策略？最终调用了哪一个 view 方法？
- `handleSetActionTab` 在 `toc`/`note` 分支里更新了哪个字段？为什么要 `setHoveredBookKey('')`？
- `needHorizontalScroll` 何时为 true？它会影响哪些 CSS class？
- Android 设备上 FooterBar 如何处理返回键？事件名是什么？
- `DesktopFooterBar` 为什么在 `hoveredBookKey` 改变时要 blur range？
- `NavigationPanel` 的 slider 与 `getNavigationHandler` 如何处理 RTL？
- `ColorPanel` 为什么要把亮度做指数映射？它保存了哪些系统设置？
- `FontLayoutPanel` 如何把一个 slider 值转换成 `marginPx`/`gapPercent`？为什么需要 `view.renderer.setAttribute('flow', 'scrolled')`？
- `ViewMenu` 切换滚动模式时做了哪些 renderer 更新？还调用了哪些工具函数？
- `zoomLevel` 变化时为什么要设置 `scale-factor`？它只适用于哪类书？
- `keepCoverSpread` 如何根据 `dir` 设置封面页？不处理会出现什么 UI 效果？
- `Sync` 菜单项如何区分登录状态？它会触发哪个事件或路由？
- `Invert Image In Dark Mode` 为什么在浅色模式下禁用？相关 store 字段是什么？

#### 第 53 课：侧栏与目录/搜索
- 覆盖模块：`apps/readest-app/src/app/reader/components/sidebar/*`、`apps/readest-app/src/app/reader/hooks/useSidebar.ts`、`apps/readest-app/src/app/reader/hooks/useSearchNav.ts`。
- 任务：实现侧栏容器、TOC 与搜索系统，并打通结果导航。
子任务清单：
1. 先理解概念（新手友好）：
   - Sidebar 是“多功能抽屉”：TOC/书摘/书签/搜索结果都放在这里。
   - 侧栏有“固定/浮动”两种模式，浮动时需要 Overlay 遮罩。
   - 搜索不仅要出结果，还要有“结果导航条”（SearchResultsNav）。
2. 代码清单（来自源码）：
   - `SideBar.tsx`：宽度/固定状态/搜索事件/拖拽调整。
   - `Header.tsx`：搜索、菜单、固定按钮与 Library 返回。
   - `Content.tsx`：Tab 切换、OverlayScrollbars、AI 历史。
   - `TOCView.tsx` + `TOCItem.tsx`：TOC 扁平化、展开/收起、虚拟列表。
   - `SearchBar.tsx` + `SearchOptions.tsx`：搜索配置、缓存、历史记录。
   - `SearchResults.tsx` + `SearchResultsNav.tsx` + `useSearchNav.ts`：结果列表与导航。
   - `BooknoteView.tsx` + `BooknoteItem.tsx`：书摘/书签展示（侧栏 Tab）。
   - `useSidebar.ts`：宽度/固定状态与全局设置持久化。
3. 逐步实现（建议顺序）：
   1) 实现 Sidebar 容器：`isSideBarVisible` 控制显示；浮动模式加 `Overlay`；设置 `safeAreaInsets` 与 `rounded-window`。
   2) 实现 Header：搜索开关、BookMenu、Pin 按钮（固定/浮动切换）。
   3) 接入 `useSidebar`：初始化宽度/固定状态；拖拽条 + 键盘调整宽度。
   4) 实现 Tab 内容容器：`TabNavigation` + `SidebarContent`，支持 `toc/annotations/bookmarks/history`。
   5) 实现 TOC：扁平化树结构、展开/收起、自动定位当前章节；大目录使用 `react-window` 虚拟列表。
   6) 实现搜索：`SearchBar` + `SearchOptions`；`view.search()` 异步 generator 拉取结果；缓存到 `Cache/search`。
   7) 实现结果列表与导航条：`SearchResults` 渲染列表；`SearchResultsNav` 支持上一条/下一条定位。
4. 常见坑与验证提醒：
   - 侧栏浮动模式需要 `Overlay`，否则点击正文时无法关闭。
   - 搜索最小字数对 CJK 是 1，对英文是 2；否则会频繁空查询。
   - TOC 自动滚动要有“冷却时间”，避免和用户滚动冲突。
   - `SearchResultsNav` 的定位基于 `CFI`，必须有 `progress.location`。
   - 搜索缓存依赖 `appService` 文件 API，Web 版需做兜底。
5. 最小验证（每步都能验证）：
   - 侧栏可显示/关闭、固定/浮动切换正常。
   - TOC 点击可跳转章节，当前章节自动高亮。
   - 搜索输入能出结果，结果列表可跳转；搜索导航条可前后切换。
验收问题（需结合源码回答）：
- `useSidebar` 初始化时把 `sideBarWidth`/`isSideBarPinned` 设置成什么？来自哪个 settings 字段？
- `SideBar` 中 `MIN_SIDEBAR_WIDTH/MAX_SIDEBAR_WIDTH` 的意义是什么？如何限制拖拽范围？
- `onSearchEvent` 收到 `search-term` 时会做哪些状态更新？为什么要 `setSideBarBookKey`？
- `SearchBar` 如何区分 CJK 与非 CJK 的最小输入长度？常量在哪里？
- 搜索缓存 key 的结构是什么？`md5` 是由哪些字段拼出来的？
- `TOCView` 什么时候使用虚拟列表？`sections.length > 256` 的判断在哪？
- `TOCView` 的自动滚动为何要 `cooldown`？`interactionCooldownMs` 用来防什么问题？
- `SearchResultsNav` 如何从搜索结果中找到“当前结果”索引？用到了哪个工具函数？
- `BooknoteView` 如何按章节分组并排序？排序用的是什么比较函数？
- `TabNavigation` 为什么在 AI 关闭时移除 `history`？这个开关来自哪个 settings 字段？

#### 第 54 课：Notebook 笔记系统
- 覆盖模块：`apps/readest-app/src/app/reader/components/notebook/*`、`apps/readest-app/src/store/notebookStore.ts`、`apps/readest-app/src/utils/sel.ts`。
- 任务：实现笔记面板、编辑器与搜索，打通与批注的联动。
子任务清单：
1. 先理解概念（新手友好）：
   - Notebook 是“右侧面板”，可固定/浮动、可调宽度。
   - 新建笔记来自“选区 + Annotator”流程，编辑笔记来自列表。
   - Notebook 里分 “Excerpts(摘录)” 与 “Notes(笔记)” 两类。
2. 代码清单（来自源码）：
   - `Notebook.tsx`：面板/拖拽/保存/删除/搜索/Tab 切换。
   - `NoteEditor.tsx`：编辑器 + draft 保存。
   - `notebook/SearchBar.tsx`：笔记搜索。
   - `NotebookTabNavigation.tsx`：Notes/AI tab。
   - `Notebook/Header.tsx`：关闭/Pin/搜索按钮。
3. 逐步实现（建议顺序）：
   1) 搭建 Notebook 容器：浮动时加 Overlay；支持拖拽调整宽度；支持 Pin 固定。
   2) 在 `useNotebookStore` 中实现 `notebookWidth/isNotebookPinned/notebookActiveTab` 等状态。
   3) 接入全局设置：`globalReadSettings.notebookWidth`、`isNotebookPinned`、`notebookActiveTab`。
   4) 实现 `handleSaveNote`：从 `view.getCFI` 生成 cfi，保存 `BookNote`，并 `view.addAnnotation` + `NOTE_PREFIX`。
   5) 实现 `handleEditNote`：更新/删除 note，写回 `booknotes` 并持久化。
   6) 实现 `NoteEditor`：支持新建/编辑，保存 draft（`md5Fingerprint`）。
   7) 实现 Notebook 搜索：过滤 `text/note` 字段，显示匹配数量与空状态。
4. 常见坑与验证提醒：
   - `sideBarBookKey` 为 null 时直接 return，避免空渲染。
   - 删除笔记要写 `deletedAt`，否则会被重新渲染。
   - 保存/编辑后记得 `saveConfig` 与 `updateBooknotes`，否则刷新丢失。
   - draft 保存依赖 `md5Fingerprint`，别用原文直接当 key。
5. 最小验证（每步都能验证）：
   - 选区后新增 note 能在 Notebook 显示并保存。
   - 编辑/删除笔记后列表更新，刷新后仍生效。
   - 搜索框能过滤 Notes/Excerpts，清空搜索恢复完整列表。
验收问题（需结合源码回答）：
- `Notebook` 初始化时如何设置 `notebookWidth` 与 `isNotebookPinned`？它们来自哪个 settings 字段？
- `handleSaveNote` 里 `NOTE_PREFIX` 的作用是什么？为什么要加前缀？
- `handleEditNote` 删除与更新的分支条件是什么？如何设置 `deletedAt`？
- `NoteEditor` 如何从 `notebookNewAnnotation` 恢复 draft？`md5Fingerprint` 用在什么场景？
- `Notebook` 为什么在 `navigate` 事件里调用 `setNotebookVisible(false)`？
- `NotebookTabNavigation` 什么时候隐藏 AI Tab？这个判断来自哪个 store？
- Notebook 搜索的过滤条件是什么？哪些字段参与匹配？
- 当 `notebookNewAnnotation` 存在时，为什么要隐藏搜索栏并强制显示 `NoteEditor`？

#### 第 55 课：批注与弹层
- 覆盖模块：`apps/readest-app/src/app/reader/components/annotator/*`、`apps/readest-app/src/app/reader/hooks/useTextSelector.ts`、`apps/readest-app/src/app/reader/hooks/useInstantAnnotation.ts`、`apps/readest-app/src/app/reader/components/FootnotePopup.tsx`。
- 任务：实现选区、批注、高亮、弹层（词典/翻译/脚注）与导出。
子任务清单：
1. 先理解概念（新手友好）：
   - Annotator 负责“选区 -> 生成 BookNote -> 画高亮 -> 弹出菜单”。
   - 选区事件来自 iframe，需要在 `onLoad` 里对 `doc` 绑定。
   - 脚注弹层是一个独立的 `<foliate-view>`，使用 FootnoteHandler 渲染。
2. 代码清单（来自源码）：
   - `Annotator.tsx`：selection 状态、`handleHighlight/Annotate/Search`、`onDrawAnnotation`。
   - `useTextSelector.ts`：selection 检测、Android/iOS 处理。
   - `AnnotationPopup.tsx`、`HighlightOptions.tsx`、`AnnotationNotes.tsx`。
   - `AnnotationTools.tsx`：按钮列表与 quick actions。
   - `ExportMarkdownDialog.tsx`：导出 Markdown 模板。
   - `FootnotePopup.tsx`：`FootnoteHandler` + 弹层。
3. 逐步实现（建议顺序）：
   1) 在 `onLoad` 绑定 iframe 事件：`touchstart/touchend/selectionchange/pointer*`。
   2) 用 `useTextSelector` 生成 `TextSelection`，并在 `useEffect` 里生成 `popup` 位置。
   3) 实现 `handleHighlight/Annotate/Copy/Search/Translate` 等动作：写入 `booknotes`，并 `view.addAnnotation`。
   4) 实现 quick action：`annotationQuickAction` + `enableAnnotationQuickActions`，满足条件立即执行。
   5) 实现 `onDrawAnnotation`：根据 `style/color` 使用 `Overlayer` 绘制高亮/下划线。
   6) 实现 `FootnotePopup`：拦截 link，交给 `FootnoteHandler` 渲染，计算弹层位置。
   7) 实现导出：`export-annotations` 事件 -> `ExportMarkdownDialog` -> `saveFile/clipboard`。
4. 常见坑与验证提醒：
   - PDF 的 CFI 支持有限，只保证 Copy/Translate，Highlight 需禁用。
   - Android 的 `native-touch` 事件要与 `selectionchange` 配合，否则选区丢失。
   - `NOTE_PREFIX` 必须添加，才能区分“批注文字”和“批注笔记”。
   - 弹层要考虑纵排模式，计算 `popupWidth/Height` 会反转。
5. 最小验证（每步都能验证）：
   - 选中文本能弹出工具条，点击“高亮/注释”可保存。
   - 书内点击脚注链接能弹出 footnote。
   - 选择文本点击“翻译/词典/维基”能打开弹层。
   - 导出能生成 markdown 并复制/保存。
验收问题（需结合源码回答）：
- `onLoad` 里为什么要给 `doc` 绑定 `pointerdown/pointerup/selectionchange`？这些事件用在什么场景？
- `useTextSelector` 里 `selectionPosition` 有什么作用？为什么只在 Android paginated 模式使用？
- `onDrawAnnotation` 如何区分 `highlight/underline/squiggly`？`padding` 为什么要参考 `lineHeight`？
- `onShowAnnotation` 如何判断“批注文字”还是“批注笔记”？`NOTE_PREFIX` 在哪里用到？
- `handleHighlight` 为什么要查 `existingIndex`？`update` 为 false 时会发生什么？
- `handleSearch` 为什么要 `runSimpleCC`？它由哪个设置字段控制？
- `handleCopy` 为什么要延迟写剪贴板？`copyToNotebook` 打开后会发生什么？
- `FootnotePopup` 如何决定“用 popup 打开还是跳转原文”？`footnoteClasses` 在哪判断？
- `ExportMarkdownDialog` 里每条注释的模板结构是什么？为什么要按章节分组？
- `useTextSelector` 中 `eventDispatcher.onSync('iframe-single-click')` 的作用是什么？

#### 第 56 课：TTS UI 与样式
- 覆盖模块：`apps/readest-app/src/app/reader/components/tts/*`、`apps/readest-app/src/components/settings/color/TTSHighlightStyleEditor.tsx`、`apps/readest-app/src/libs/mediaSession.ts`。
- 任务：迁移 TTS 控制 UI、播放状态与高亮样式设置。
子任务清单：
1. 先理解概念（新手友好）：
   - TTS 由 `eventDispatcher` 触发（`tts-speak/tts-stop`）。
   - UI 分三层：悬浮图标 + 弹窗面板 + 底部条。
   - 高亮样式由 settings 控制，影响 `ttsHighlightOptions`。
2. 代码清单（来自源码）：
   - `TTSControl.tsx`：主控制器、MediaSession、事件监听。
   - `TTSPanel.tsx`：语速/音色/定时器 UI。
   - `TTSBar.tsx`：底部播放条。
   - `TTSIcon.tsx`：浮动按钮。
   - `TTSHighlightStyleEditor.tsx`：高亮样式与颜色选择。
3. 逐步实现（建议顺序）：
   1) 先接入 `eventDispatcher`：响应 `tts-speak`/`tts-stop`，并在 store 中设置 `ttsEnabled`。
   2) 实现 `TTSIcon` + `Popup` 位置计算，点击打开 `TTSPanel`。
   3) 实现 `TTSPanel`：语速 slider、音色选择、定时器，写回 `viewSettings` 与 `settings`。
   4) 实现 `TTSBar`：播放/前后跳转按钮，移动端安全区适配。
   5) 接入 `MediaSession`：更新播放状态与元信息（标题/作者/封面）。
   6) 实现高亮样式编辑：`TTSHighlightStyleEditor` 更新 `ttsHighlightOptions`。
4. 常见坑与验证提醒：
   - PDF 不支持 TTS，需要直接 toast 提示并中止。
   - iOS 需要 `invokeUseBackgroundAudio`；移动端需要 `unblockAudio` 防静音。
   - `handleSetRate/handleSetVoice` 使用 throttle，避免频繁重启引擎。
   - `ttsLocation` 保存用于恢复朗读位置，注意 CFI 与 progress 对齐。
5. 最小验证（每步都能验证）：
   - 点击“朗读”能启动/暂停/停止。
   - 语速/音色切换生效并持久化。
   - TTSBar 可显示并控制播放。
   - 高亮样式设置能影响朗读时的高亮颜色。
验收问题（需结合源码回答）：
- `handleTTSSpeak` 如何确定朗读起点？`range`/`ttsLocation`/`progress.range` 的优先级是什么？
- `unblockAudio` 为什么播放 `SILENCE_DATA`？它解决什么问题？
- `initMediaSession` 在 Tauri 下如何设置元信息？封面加载失败时如何兜底？
- `handleHighlightMark` 为什么在 scrolled 模式要手动 `scrollToAnchor`？如何计算 overlap？
- `getTTSTargetLang` 如何根据 `ttsReadAloudText` 决定语言？
- `handleSetRate`/`handleSetVoice` 为什么要 `throttle(3000)`？播放中会做哪些额外操作？
- `handleToggleTTSBar` 更新了哪个 viewSettings 字段？为什么要 `setViewSettings`？
- `TTSPanel` 的定时器如何更新倒计时？`timeoutTimestamp` 什么时候清零？
- `TTSHighlightStyleEditor` 如何处理自定义颜色的保存/删除？防重复逻辑在哪里？

### 阶段 H：书库与周边功能（第 57-64 课）
#### 第 57 课：Library 页面框架
- 覆盖模块：`apps/readest-app/src/app/library/page.tsx`、`apps/readest-app/src/app/library/components/LibraryHeader.tsx`、`apps/readest-app/src/app/library/components/Bookshelf.tsx`、`apps/readest-app/src/app/library/hooks/useBooksSync.ts`、`apps/readest-app/src/app/library/hooks/useDragDropImport.ts`、`apps/readest-app/src/app/library/hooks/useDemoBooks.ts`、`apps/readest-app/src/hooks/useOpenWithBooks.ts`、`apps/readest-app/src/hooks/usePullToRefresh.ts`、`apps/readest-app/src/hooks/useFileSelector.ts`。
- 任务：搭建 Library 根页面与初始化逻辑，完成“加载设置/书库/导航/弹窗”的主流程。
子任务清单：
1. 先理解概念（新手友好）：
   - Library 页面是“应用主页”，负责加载 settings、library、open-with、同步与全局弹窗。
   - 页面初始化必须可重复进入且不重复执行（用 `isInitiating` 保护）。
   - 书库 UI 分三层：Header、Bookshelf/空状态、全局弹窗。
2. 代码清单（来自源码）：
   - `page.tsx`：`initLibrary/initLogin`、`handleImportBooksFromFiles`、`handleOpenLastBooks`。
   - `LibraryHeader.tsx`：搜索、导入菜单、视图菜单、选择模式。
   - `useBooksSync.ts`：`pullLibrary/pushLibrary`、`syncProgress`。
   - `useDragDropImport.ts`：拖拽导入与 `import-book-files` 事件。
   - `usePullToRefresh.ts`：下拉刷新 Library。
   - `useDemoBooks.ts`：Web demo library 注入。
3. 逐步实现（建议顺序）：
   1) 建立 `routes/library/+page.svelte` 的页面壳，加载 `LibraryHeader` + `Bookshelf`。
   2) 实现初始化：读取 `settings` 与 `libraryBooks`，设置 `libraryLoaded`，控制 `loading`。
   3) 加入 `useOpenWithBooks` 与 `parseOpenWithFiles`，支持“打开文件自动导入/打开”。
   4) 加入 `useBooksSync`，并用 `usePullToRefresh` 触发 `pullLibrary()`。
   5) 处理 `lastOpenBooks` 与 `openLastBooks`：加载后可自动跳转 Reader。
   6) 将全局弹窗挂载到页面：`BookDetailModal`、`TransferQueuePanel`、`SettingsDialog`、`OPDSDialog`、`MigrateDataWindow`、`AboutWindow`、`UpdaterWindow`、`Toast`。
   7) 空书库时渲染 hero 占位，已有书籍时渲染 `OverlayScrollbars` + `Bookshelf`。
4. 常见坑与验证提醒：
   - `appService` 或 `safeAreaInsets` 未就绪时要返回空壳，避免 NPE。
   - `checkOpenWithBooks`/`checkLastOpenBooks` 是一次性开关，离开时要重置。
   - `pendingNavigationBookIds` 需要异步触发 `navigateToReader`，避免渲染中跳转。
   - 初始化与 `searchParams` 相关，必须防重复执行（`isInitiating`）。
5. 最小验证（每步都能验证）：
   - 首次进入能加载书库并显示 Header + Bookshelf。
   - “open with” 文件能自动导入并打开。
   - 下拉刷新触发同步，`progress` 条显示正确。
   - 空书库时显示引导文案与导入按钮。
验收问题（需结合源码回答）：
- `LibraryPageContent` 为什么先检查 `appService` 与 `safeAreaInsets`？缺失会导致什么问题？
- `initLibrary` 中 `checkOpenWithBooks`/`checkLastOpenBooks` 的顺序是什么？为什么这样排序？
- `pendingNavigationBookIds` 在哪个 effect 中触发跳转？为什么不直接在导入时导航？
- `usePullToRefresh` 如何判断达到触发阈值？`TRIGGER_THRESHOLD` 的作用是什么？
- `useBooksSync` 的 `pullLibrary/pushLibrary` 分别在什么场景被调用？
- `useDemoBooks` 只在什么平台触发？它如何避免重复导入？
- `LibraryHeader` 的搜索框如何与 URL 参数同步？使用了什么防抖策略？

#### 第 58 课：Bookshelf 与卡片
- 覆盖模块：`apps/readest-app/src/app/library/components/Bookshelf.tsx`、`BookshelfItem.tsx`、`BookItem.tsx`、`GroupItem.tsx`、`ReadingProgress.tsx`、`SelectModeActions.tsx`、`apps/readest-app/src/components/BookCover.tsx`。
- 任务：实现书架网格/列表布局、书籍卡片与分组预览。
子任务清单：
1. 先理解概念（新手友好）：
   - Bookshelf 渲染的是“书籍 + 分组”的混合列表。
   - 视图模式有 `grid/list`，影响布局、封面大小与交互。
   - 选择模式下，需要展示批量操作条。
2. 代码清单（来自源码）：
   - `Bookshelf.tsx`：`generateBookshelfItems`、选择模式、分组/删除。
   - `BookshelfItem.tsx`：长按/右键、open/selection 逻辑。
   - `BookItem.tsx`：封面、标题、进度、上传/下载按钮。
   - `GroupItem.tsx`：分组预览 + 滚动箭头。
   - `BookCover.tsx`：封面加载 + fallback。
3. 逐步实现（建议顺序）：
   1) 实现 `generateBookshelfItems`：把书籍按 `groupName` 合并成 `BooksGroup`。
   2) 实现 `Bookshelf`：根据 `viewMode` 生成 grid/list，渲染 `BookshelfItem`。
   3) 实现 `BookshelfItem`：点击打开书或进入分组；长按/右键进入选择。
   4) 实现 `BookItem`：封面 + 标题 + 进度条；支持“上传/下载/详情”图标。
   5) 实现 `GroupItem`：展示组内封面预览（grid/横向滚动）。
   6) 实现 `SelectModeActions`：批量打开/分组/详情/删除。
4. 常见坑与验证提醒：
   - `book.progress` 可能为空，要容错，不显示进度。
   - `BookCover` 失败时要显示 fallback 文本封面。
   - 选择模式下点击应走“选中”，而不是“打开”。
   - `transferProgress === 100` 时不再显示进度环。
5. 最小验证（每步都能验证）：
   - grid/list 切换布局正常，书籍与分组都能显示。
   - 点击书籍可打开 Reader，点击分组进入子组。
   - 长按进入选择模式，底部操作条显示并可删除。
验收问题（需结合源码回答）：
- `generateBookshelfItems` 如何把 `groupName` 拆成 `displayName`？`BOOK_UNGROUPED` 在哪用？
- `Bookshelf` 中 `gridTemplateColumns` 何时来自 `settings.libraryColumns`？
- `BookshelfItem` 如何区分 book 与 group？`'format' in item` 的意义是什么？
- `BookItem` 何时显示上传/下载图标？它依赖 `uploadedAt/downloadedAt` 哪些字段？
- `ReadingProgress` 如何从 `book.progress` 计算百分比？如何防止 NaN？
- `BookCover` 在图片加载失败时做了什么 fallback？
- `GroupItem` 的左右箭头何时显示？它通过哪个 scroll 条件判断？

#### 第 59 课：导入流程
- 覆盖模块：`apps/readest-app/src/hooks/useFileSelector.ts`、`apps/readest-app/src/app/library/hooks/useDragDropImport.ts`、`apps/readest-app/src/helpers/openWith.ts`、`apps/readest-app/src/hooks/useOpenWithBooks.ts`、`apps/readest-app/src/app/library/page.tsx`。
- 任务：实现“选择文件/目录/拖拽/打开方式”的导入全链路。
子任务清单：
1. 先理解概念（新手友好）：
   - 导入分 4 条路径：文件选择、目录导入、拖拽导入、open-with。
   - Web 与 Tauri 路径不同：Web 是 `File`，Tauri 是 `path`。
   - 导入后的目标是“写入 libraryStore + 导航 Reader”。
2. 代码清单（来自源码）：
   - `useFileSelector.ts`：`selectFiles`、`FILE_SELECTION_PRESETS`。
   - `useDragDropImport.ts`：拖拽过滤 + `import-book-files` 事件。
   - `openWith.ts`：解析 window/CLI/intent files。
   - `useOpenWithBooks.ts`：Tauri 事件监听与导航。
   - `LibraryPage`：`importBooks`、`handleImportBooksFromFiles/Directory`、`processOpenWithFiles`。
3. 逐步实现（建议顺序）：
   1) 实现 `useFileSelector`：Web 用 `<input type=file>`，Tauri 用 `appService.selectFiles`。
   2) 实现 `useDragDropImport`：过滤 `BOOK_ACCEPT_FORMATS`，派发 `import-book-files`。
   3) 在 Library 页面监听 `import-book-files` 并调用 `importBooks`。
   4) 完成 `importBooks`：并发导入 + 错误映射 + toast + `pushLibrary`。
   5) 实现目录导入：Android 走 `selectDirectory` + 权限请求；桌面走 `readDirectory`。
   6) 实现 open-with：`parseOpenWithFiles` + `useOpenWithBooks` + `pendingNavigationBookIds`。
4. 常见坑与验证提醒：
   - iOS/Android 可能无法过滤扩展名，需手动二次过滤。
   - `content://` 需要保留原始路径，不能强制 `file://`。
   - 导入并发过高会卡死，源码用 `concurrency = 4`。
   - `autoImportBooksOnOpen` 会影响 open-with 的临时导入逻辑。
5. 最小验证（每步都能验证）：
   - 选择文件导入成功，导入后能打开 Reader。
   - 拖拽一本书到页面显示 DropIndicator 并导入。
   - open-with 文件能自动出现在 Library 并打开。
验收问题（需结合源码回答）：
- `useFileSelector` 为什么在 iOS/Android “不使用过滤器”？`noFilter` 的条件是什么？
- `parseOpenWithFiles` 的优先级顺序是什么？window/CLI/intent 各走哪条路径？
- `useDragDropImport` 过滤扩展名用的是 `BOOK_ACCEPT_FORMATS` 还是 `SUPPORTED_BOOK_EXTS`？区别是什么？
- `importBooks` 里的 `errorMap` 如何把原始错误转换成用户友好提示？
- `processOpenWithFiles` 为什么要传 `temp` 标志？`autoImportBooksOnOpen` 影响了什么？
- 目录导入如何构造 `groupId/groupName`？`path/basePath` 的用法是什么？
- 为什么导入后先设置 `pendingNavigationBookIds`，而不是直接 `navigateToReader`？

#### 第 60 课：分组与视图模式
- 覆盖模块：`apps/readest-app/src/app/library/utils/libraryUtils.ts`、`apps/readest-app/src/app/library/components/ViewMenu.tsx`、`GroupingModal.tsx`、`GroupItem.tsx`、`Bookshelf.tsx`、`LibraryHeader.tsx`、`SelectModeActions.tsx`。
- 任务：实现分组/排序/视图模式/面包屑的完整链路。
子任务清单：
1. 先理解概念（新手友好）：
   - 分组通过 `groupName` 的路径（`/`）实现层级。
   - 视图模式与排序由 settings 与 URL 参数共同控制。
   - 面包屑是“当前组路径”的 UI 显示。
2. 代码清单（来自源码）：
   - `libraryUtils.ts`：`createBookFilter`、`createBookSorter`、`getBreadcrumbs`。
   - `ViewMenu.tsx`：view/sort/cover/columns 选项。
   - `GroupingModal.tsx`：创建/重命名/移出分组。
   - `Bookshelf.tsx`：`updateUrlParams`、分组空状态修正。
3. 逐步实现（建议顺序）：
   1) 实现 `createBookFilter`（支持 regex 与 fallback 搜索）。
   2) 实现 `createBookSorter`（title/author/updated/published）。
   3) 在 `Bookshelf` 中接入 `view/sort/order/cover` 参数，形成统一的排序/过滤流程。
   4) 实现 `ViewMenu`：修改 settings + 写 URL 参数（view/cover/sort/order）。
   5) 实现 `GroupingModal`：创建、重命名、移出分组，并更新 `groupId/groupName`。
   6) 生成面包屑：`getBreadcrumbs(currentPath)` 并在 Library 顶部渲染。
4. 常见坑与验证提醒：
   - `groupName` 改名要递归更新子分组（`oldGroupName/xxx`）。
   - `createBookFilter` 的 regex 构造会抛错，必须 fallback。
   - `ViewMenu` 会删除默认参数（例如 view=grid），防止 URL 冗余。
   - 选择模式下分组/删除需要区分 “book hash” 和 “group id”。
5. 最小验证（每步都能验证）：
   - 切换 list/grid、cover fit、排序方式能立即生效。
   - 新建分组、重命名、移出分组后，面包屑与列表正确更新。
   - 搜索关键字过滤正确，清空恢复。
验收问题（需结合源码回答）：
- `createBookFilter` 的 regex 失败时 fallback 搜索哪些字段？
- `createBookSorter` 里 `published` 日期无效时如何处理？
- `ViewMenu` 为什么要删除默认参数（比如 `view=grid`）？在哪段代码实现？
- `GroupingModal` 如何判断“当前选择是组还是书”？`isMd5` 的用途是什么？
- 重命名组时如何更新子组路径？涉及哪些字段更新？
- `Bookshelf` 中 `updateUrlParams` 何时会删掉 `group` 参数？
- `SelectModeActions` 为什么只有 `isMd5` 的选中项才允许“打开/详情”？

#### 第 61 课：元数据编辑
- 覆盖模块：`components/metadata/*`。
- 任务：迁移书籍详情与元数据编辑流程。
子任务清单：
1. 迁移 BookDetailModal。
2. 迁移表单字段与校验逻辑。
3. 更新元数据并刷新列表。
- 验收：元数据可更新。

#### 第 62 课：传输队列
- 覆盖模块：`transferManager.ts`、`TransferQueuePanel.tsx`。
- 任务：迁移上传/下载/删除队列。
子任务清单：
1. 迁移 transferManager 与队列状态。
2. 迁移队列 UI 面板。
3. 验证进度更新与错误提示。
- 验收：队列进度可展示。

#### 第 63 课：OPDS 与外部书源
- 覆盖模块：`OPDSDialog.tsx`、`services/opds` 相关逻辑。
- 任务：迁移 OPDS 目录与搜索。
子任务清单：
1. 迁移 OPDS 目录管理 UI。
2. 迁移 OPDS 搜索与解析逻辑。
3. 打开 OPDS 书籍进入阅读器。
- 验收：OPDS 书源可访问。

#### 第 64 课：演示库与离线页
- 覆盖模块：`src/data/demo/*`、`app/offline/page.tsx`。
- 任务：迁移演示库与离线提示。
子任务清单：
1. 迁移 demo 数据与示例封面。
2. 迁移离线页与提示文案。
3. 在无书籍时展示演示库。
- 验收：无数据时能展示演示书籍。

### 阶段 I：高级服务与平台（第 65-72 课）
#### 第 65 课：认证与用户系统
- 覆盖模块：`apps/readest-app/src/app/auth/*`、`src/app/user/*`。
- 任务：迁移登录、回调、用户页面与订阅提示。
子任务清单：
1. 迁移认证页面与回调流程。
2. 迁移用户信息与订阅展示。
3. 处理未登录状态的导航。
- 验收：用户流程可跑通。

#### 第 66 课：TTS 服务层
- 覆盖模块：`apps/readest-app/src/services/tts/*`。
- 任务：整合 Edge/Web/Native TTS 与 mediaSession。
子任务清单：
1. 迁移 TTS 客户端与控制器。
2. 迁移 mediaSession 交互。
3. 与 TTS UI 联动。
- 验收：朗读引擎可用。

#### 第 67 课：翻译服务层
- 覆盖模块：`apps/readest-app/src/services/translators/*`。
- 任务：迁移翻译提供商与缓存。
子任务清单：
1. 迁移翻译 provider 与 API 接入。
2. 迁移缓存与预处理逻辑。
3. 在阅读器中触发翻译。
- 验收：文本翻译可用。

#### 第 68 课：校对与文本处理
- 覆盖模块：`apps/readest-app/src/services/transformers/proofread.ts`、`components/ProofreadRules.tsx`。
- 任务：迁移校对规则与 UI。
子任务清单：
1. 迁移校对规则与替换逻辑。
2. 迁移校对规则管理 UI。
3. 在阅读器中验证效果。
- 验收：校对规则可生效。

#### 第 69 课：KOSync 全链路
- 覆盖模块：`apps/readest-app/src/services/sync/KOSyncClient.ts`、`KOSyncResolver.tsx`。
- 任务：迁移同步状态机与冲突处理。
子任务清单：
1. 迁移 KOSyncClient 与状态机。
2. 迁移冲突解决弹窗与流程。
3. 在进度变化时触发同步。
- 验收：同步可完成且可处理冲突。

#### 第 70 课：AI 与助手系统
- 覆盖模块：`apps/readest-app/src/services/ai/*`、`components/assistant/*`。
- 任务：迁移 AI 会话、embedding、RAG。
子任务清单：
1. 迁移 AI provider 与接口封装。
2. 迁移聊天 UI 与消息渲染。
3. 接入 RAG/embedding 并验证。
- 验收：助手功能可用。

#### 第 71 课：支付与订阅
- 覆盖模块：`apps/readest-app/src/libs/payment/*`、`apps/readest-app/src/app/api/stripe/*`。
- 任务：迁移 Stripe/IAP 与订阅逻辑。
子任务清单：
1. 迁移支付类型与配置。
2. 迁移前端支付流程与回调。
3. 验证订阅状态更新。
- 验收：订阅流程可走通。

#### 第 72 课：平台适配与发布
- 覆盖模块：`apps/readest-app/src-tauri/*`、`packages/tauri-plugins/*`、`apps/readest-app/src/sw.ts`。
- 任务：迁移 Tauri 插件、更新系统、构建发布流程与测试。
子任务清单：
1. 迁移 Tauri 配置与插件依赖。
2. 迁移更新与发布脚本。
3. 验证打包流程与 PWA 行为。
- 验收：打包与发布流程可用。
