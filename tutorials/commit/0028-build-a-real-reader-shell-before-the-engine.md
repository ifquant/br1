# 0028 Build a real reader shell before the engine

## 背景

`library` 这边已经先对齐了不少层级，下一步自然会进入真正的主战场：

- `reader`

但一上来就接 `foliate-js` 其实风险很高，因为如果阅读器主舞台本身的层级还没搭正，后面很容易一边接引擎一边返工壳层。

所以这一步刻意不接阅读引擎，而是先把 `reader` 的主界面骨架压成更像真正阅读器的样子。

## 主要目标

- 让 `reader` 脱离“大说明页”的感觉
- 建立更接近 `Readest` 的三栏阅读器结构
- 把中央主舞台变成真正的阅读画布容器，而不是解释文字区

## 改动概览

- 更新 `src/routes/reader/+page.svelte`
  - 收紧整体三栏比例
  - 把右侧 bridge 区改成更像 contextual panel 的形态
- 更新 `src/lib/components/reader/ReaderSidebar.svelte`
  - 收紧成更像真正 reader sidebar 的工具区 + tab + toc
- 更新 `src/lib/components/reader/ReaderWorkspace.svelte`
  - 去掉大标题和说明段落
  - 改成更像真实 reader header / canvas / footer 的结构
- 更新 `src/lib/components/reader/ReaderViewport.svelte`
  - 把中央区域做成更像 paper stage 的阅读主舞台

## 关键知识

### 1. 阅读器对齐时，先对齐“主舞台层级”，通常比先接引擎更重要

很多人做阅读器时会忍不住先接：

- 翻页
- TOC
- 渲染引擎

但如果主舞台层级还不对，最后常会出现：

- 功能接进去了
- 但整体 still 不像阅读器

这是因为阅读器最值钱的第一层不是“功能多”，而是：

- 正文是不是绝对主角
- sidebar 是不是工具区，而不是说明区
- contextual panel 是不是辅助面，而不是主舞台竞争者

所以这一步先做的是：

- 三栏职责明确
- 中央舞台最大
- 文案说明退到最少

这类工作看起来不像“接功能”，但它决定后面功能挂进来时是不是自然。

### 2. `sidebar / viewport / contextual panel` 最好一开始就有明确职责

这一步实际上是在给三栏定职责：

- 左栏：导航和切换
- 中栏：阅读主舞台
- 右栏：`br1` 自己的 bridge contextual surface

如果这一步不先定，后面很容易出现：

- TOC 往中间挤
- bridge 往正文里挤
- toolbar 不知道归谁

界面最后会变成一团功能拼盘。

一个很实用的经验是：

- 在接复杂能力前
- 先问每一栏“它负责什么，不负责什么”

这样后面的每个功能就知道该挂在哪一层。

### 3. 中央阅读画布的“纸面感”可以先独立成立

这一步的 `ReaderViewport` 还没有接引擎，但已经先做了一层更像阅读纸面的主舞台：

- 外层是 reader host
- 内层是 paper stage
- 中间是之后真正引擎要接管的位置

这是一种很有价值的分层：

- 外层决定 reader chrome 和空间关系
- 内层决定阅读感
- 引擎只负责接管正文内容

这样以后接 `foliate-js` 时，你不是在“从零发明阅读器”，而是在“把引擎放进已经正确的阅读器壳”。

## 验证

- `pnpm check` (PASS)

## 未覆盖项

- 这次没有接 `foliate-js`
- 这次没有接 TTS、TOC 逻辑或 bridge 行为
- 这次只把 reader 壳层压到更接近真实阅读器的主舞台结构
